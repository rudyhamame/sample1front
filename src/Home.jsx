import { Link, useHistory } from "react-router-dom";
import Nav from "./App/Header/Nav/Nav";
import React, { useState } from "react";
import { apiUrl } from "./config/api";
import { compressVideo } from "./utils/video-compress";
import ImageViewerModal from "./App/components/image-viewer/ImageViewerModal";
import FriendChat from "./PhenomedSocial/moi/friends/FriendChat/FriendChat";

const NAGHAM_COURSE_LETTERS_STORAGE_KEY = "schoolPlanner_nagham_course_letters";
const NAGHAM_COURSE_LIST_STORAGE_KEY = "schoolPlanner_nagham_course_list";
const SCHOOLPLANNER_MUSIC_STORAGE_KEY = "schoolPlanner_music_archive_items";
const SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY = "schoolPlanner_reduce_motion";
const PHENOMEDSOCIAL_CHAT_BG_STORAGE_KEY =
  "phenomedSocial_chat_messages_background";
const HOME_PROFILE_PIC_VIEWPORT_STORAGE_KEY =
  "home_profile_pic_viewport_transform";
const DEFAULT_NAGHAM_COURSE_LETTER =
  "For dear naghamtrkmani: keep going, keep glowing, and let every page carry you a little closer to your beautiful goal.";
const DEFAULT_ARCHIVE_MUSIC_IDENTIFIERS = [
  "MoonlightSonata_755",
  "fur-elise-by-beethoven-beethoven",
  "gymnopedie-no.-1",
  "NocturneCSharpMinor",
];

const sanitizeGalleryFileName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `gallery-${Date.now()}`;

const VIDEO_FORMATS = new Set([
  "mp4",
  "mov",
  "webm",
  "m4v",
  "avi",
  "mkv",
  "ogv",
]);

const isVideoGalleryItem = (item) => {
  const resourceType = String(item?.resourceType || item?.resource_type || "")
    .trim()
    .toLowerCase();
  if (resourceType === "video") {
    return true;
  }

  const mimeType = String(item?.mimeType || item?.mime_type || "")
    .trim()
    .toLowerCase();
  if (mimeType.startsWith("video/")) {
    return true;
  }

  const format = String(item?.format || "")
    .trim()
    .toLowerCase();
  if (VIDEO_FORMATS.has(format)) {
    return true;
  }

  const url = String(item?.url || item?.secure_url || "")
    .trim()
    .toLowerCase();
  return url.includes("/video/upload/");
};

const HOME_GALLERY_UPLOAD_DB_NAME = "home_media_uploads";
const HOME_GALLERY_UPLOAD_STORE_NAME = "pending_uploads";

const openHomeGalleryUploadDb = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(HOME_GALLERY_UPLOAD_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(HOME_GALLERY_UPLOAD_STORE_NAME)) {
        database.createObjectStore(HOME_GALLERY_UPLOAD_STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Unable to open upload storage."));
    };
  });

const getPendingGalleryUploads = async () => {
  const database = await openHomeGalleryUploadDb();
  if (!database) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      HOME_GALLERY_UPLOAD_STORE_NAME,
      "readonly",
    );
    const store = transaction.objectStore(HOME_GALLERY_UPLOAD_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const uploads = Array.isArray(request.result) ? request.result : [];
      uploads.sort(
        (firstUpload, secondUpload) =>
          new Date(firstUpload?.createdAt || 0).getTime() -
          new Date(secondUpload?.createdAt || 0).getTime(),
      );
      resolve(uploads);
    };

    request.onerror = () => {
      reject(request.error || new Error("Unable to read pending uploads."));
    };
  });
};

const savePendingGalleryUpload = async (uploadTask) => {
  const database = await openHomeGalleryUploadDb();
  if (!database || !uploadTask?.id) {
    return;
  }

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(
      HOME_GALLERY_UPLOAD_STORE_NAME,
      "readwrite",
    );
    const store = transaction.objectStore(HOME_GALLERY_UPLOAD_STORE_NAME);
    const request = store.put(uploadTask);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error || new Error("Unable to persist upload task."));
  });
};

const deletePendingGalleryUpload = async (uploadTaskId) => {
  const database = await openHomeGalleryUploadDb();
  if (!database || !uploadTaskId) {
    return;
  }

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(
      HOME_GALLERY_UPLOAD_STORE_NAME,
      "readwrite",
    );
    const store = transaction.objectStore(HOME_GALLERY_UPLOAD_STORE_NAME);
    const request = store.delete(uploadTaskId);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error || new Error("Unable to clear upload task."));
  });
};

const clearPendingGalleryUploads = async () => {
  const pendingUploads = await getPendingGalleryUploads();
  const pendingUploadIds = pendingUploads
    .map((uploadTask) => String(uploadTask?.id || "").trim())
    .filter(Boolean);

  for (const uploadId of pendingUploadIds) {
    await deletePendingGalleryUpload(uploadId);
  }

  return pendingUploadIds.length;
};

const buildInternetArchiveSearchUrl = (queryText) => {
  const normalizedQuery = String(queryText || "").trim();
  const searchQuery = `mediatype:audio AND collection:opensource_audio AND (${[
    `identifier:"${normalizedQuery}"`,
    `title:"${normalizedQuery}"`,
    `subject:"${normalizedQuery}"`,
    `creator:"${normalizedQuery}"`,
  ].join(" OR ")})`;

  return `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
    searchQuery,
  )}&fl[]=identifier,title,creator&sort[]=downloads desc&rows=8&page=1&output=json`;
};

function Home(props) {
  // Determine if the current user is naghamtrkmani
  const isNaghamtrkmani =
    String(props.state?.username || "").toLowerCase() === "naghamtrkmani";
  // Set background style for everyone except naghamtrkmani
  const baseUrl =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const homeBackgroundStyle = !isNaghamtrkmani
    ? {
        backgroundImage: `url(${baseUrl}img/brushstroke-texture-modern-design.jpg)`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        minHeight: "100vh",
      }
    : {};
  // State to track which friend's chat is open
  const [openChatFriendId, setOpenChatFriendId] = useState(null);
  const history = useHistory();
  const galleryUploadInputRef = React.useRef(null);
  const hasRecoveredPendingUploadsRef = React.useRef(false);
  const profilePictureWrapperRef = React.useRef(null);
  const profilePictureGestureRef = React.useRef({
    mode: "idle",
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    startDistance: 0,
    startScale: 1,
  });
  const [isImageGalleryUploading, setIsImageGalleryUploading] = useState(false);
  const [isImageGalleryDeletingPublicId, setIsImageGalleryDeletingPublicId] =
    useState("");
  const [
    isImageGallerySettingProfilePublicId,
    setIsImageGallerySettingProfilePublicId,
  ] = useState("");
  const [clearPendingFeedback, setClearPendingFeedback] = useState("");
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [activeGalleryImageIndex, setActiveGalleryImageIndex] = useState(0);
  const [activeGalleryActionsPublicId, setActiveGalleryActionsPublicId] =
    useState("");
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordFeedback, setPasswordFeedback] = useState({
    tone: "",
    message: "",
  });
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isAcademicInfoEditing, setIsAcademicInfoEditing] = useState(false);
  const [academicInfoFields, setAcademicInfoFields] = useState({
    program: "",
    university: "",
    studyYear: "",
    term: "",
  });
  const [academicInfoFeedback, setAcademicInfoFeedback] = useState({
    tone: "",
    message: "",
  });
  const [isAcademicInfoSubmitting, setIsAcademicInfoSubmitting] =
    useState(false);
  const [activePersonalInfoField, setActivePersonalInfoField] = useState("");
  const [personalInfoInputValue, setPersonalInfoInputValue] = useState("");
  const [isPersonalInfoInlineSubmitting, setIsPersonalInfoInlineSubmitting] =
    useState(false);
  const [loginLogEntries, setLoginLogEntries] = useState([]);
  const [isLoginLogDeleting, setIsLoginLogDeleting] = useState(false);
  const [loginLogError, setLoginLogError] = useState("");
  const [visitLogEntries, setVisitLogEntries] = useState([]);
  const [isVisitLogLoading, setIsVisitLogLoading] = useState(false);
  const [visitLogError, setVisitLogError] = useState("");
  const [isVisitLogDeleting, setIsVisitLogDeleting] = useState(false);
  const [loginLogIndex, setLoginLogIndex] = useState(0);
  const [visitLogIndex, setVisitLogIndex] = useState(0);
  const [naghamCourseLetters, setNaghamCourseLetters] = useState(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      return (
        JSON.parse(
          window.localStorage.getItem(NAGHAM_COURSE_LETTERS_STORAGE_KEY) ||
            "{}",
        ) || {}
      );
    } catch (error) {
      return {};
    }
  });
  const [naghamCourseOptions, setNaghamCourseOptions] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      return (
        JSON.parse(
          window.localStorage.getItem(NAGHAM_COURSE_LIST_STORAGE_KEY) || "[]",
        ) || []
      );
    } catch (error) {
      return [];
    }
  });
  const [selectedNaghamCourseId, setSelectedNaghamCourseId] = useState("");
  const [naghamCourseLetterInput, setNaghamCourseLetterInput] = useState("");
  const [naghamCourseLetterFeedback, setNaghamCourseLetterFeedback] =
    useState("");
  const [musicArchivePlaylistInput, setMusicArchivePlaylistInput] = useState(
    () => {
      if (typeof window === "undefined") {
        return DEFAULT_ARCHIVE_MUSIC_IDENTIFIERS.join("\n");
      }

      try {
        const storedItems = JSON.parse(
          window.localStorage.getItem(SCHOOLPLANNER_MUSIC_STORAGE_KEY) || "[]",
        );
        const nextItems =
          Array.isArray(storedItems) && storedItems.length > 0
            ? storedItems
            : DEFAULT_ARCHIVE_MUSIC_IDENTIFIERS;

        return nextItems.join("\n");
      } catch (error) {
        return DEFAULT_ARCHIVE_MUSIC_IDENTIFIERS.join("\n");
      }
    },
  );
  const [musicArchivePlaylistFeedback, setMusicArchivePlaylistFeedback] =
    useState("");
  const [musicArchiveSearchQuery, setMusicArchiveSearchQuery] = useState("");
  const [musicArchiveSearchResults, setMusicArchiveSearchResults] = useState(
    [],
  );
  const [musicArchiveSearchFeedback, setMusicArchiveSearchFeedback] =
    useState("");
  const [isMusicArchiveSearching, setIsMusicArchiveSearching] = useState(false);
  const [schoolPlannerTelegramFeedback, setSchoolPlannerTelegramFeedback] =
    useState("");
  const [phenomedSocialChatBackground, setPhenomedSocialChatBackground] =
    useState(() => {
      if (typeof window === "undefined") {
        return "";
      }

      return String(
        window.localStorage.getItem(PHENOMEDSOCIAL_CHAT_BG_STORAGE_KEY) || "",
      ).trim();
    });
  const [schoolPlannerReducedMotion, setSchoolPlannerReducedMotion] = useState(
    () => {
      if (typeof window === "undefined") {
        return false;
      }

      return (
        String(
          window.localStorage.getItem(
            SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY,
          ) || "",
        ).trim() === "true"
      );
    },
  );
  const [schoolPlannerTelegramGroupInput, setSchoolPlannerTelegramGroupInput] =
    useState("");
  const [telegramApiIdInput, setTelegramApiIdInput] = useState("");
  const [telegramApiHashInput, setTelegramApiHashInput] = useState("");
  const [telegramPhoneNumberInput, setTelegramPhoneNumberInput] = useState("");
  const [telegramPhoneCodeInput, setTelegramPhoneCodeInput] = useState("");
  const [telegramPasswordInput, setTelegramPasswordInput] = useState("");
  const [telegramConfigFeedback, setTelegramConfigFeedback] = useState("");
  const [telegramConfigStatus, setTelegramConfigStatus] = useState({
    configured: false,
    hasApiId: false,
    hasApiHash: false,
    hasStringSession: false,
    groupReference: "",
  });
  const [telegramAuthStage, setTelegramAuthStage] = useState("idle");
  const [openReportSections, setOpenReportSections] = useState({});
  const [isReportsWrapperOpen, setIsReportsWrapperOpen] = useState(false);
  const [isProfilePictureDragging, setIsProfilePictureDragging] =
    useState(false);
  const [profilePictureViewport, setProfilePictureViewport] = useState(() => {
    if (typeof window === "undefined") {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }

    try {
      const parsedViewport = JSON.parse(
        window.localStorage.getItem(HOME_PROFILE_PIC_VIEWPORT_STORAGE_KEY) ||
          "{}",
      );

      const scale = Number(parsedViewport?.scale) || 1;
      const offsetX = Number(parsedViewport?.offsetX) || 0;
      const offsetY = Number(parsedViewport?.offsetY) || 0;

      return {
        scale: Math.min(Math.max(scale, 1), 4),
        offsetX,
        offsetY,
      };
    } catch {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }
  });

  const isReportSectionOpen = (sectionKey) =>
    Boolean(openReportSections?.[sectionKey]);

  const toggleReportSection = (sectionKey) => {
    setOpenReportSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections?.[sectionKey],
    }));
  };

  React.useEffect(() => {
    setAcademicInfoFields({
      program: String(props.state?.program || ""),
      university: String(props.state?.university || ""),
      studyYear: String(props.state?.studyYear || ""),
      term: String(props.state?.term || ""),
    });
  }, [
    props.state?.program,
    props.state?.university,
    props.state?.studyYear,
    props.state?.term,
  ]);

  React.useEffect(() => {
    setLoginLogEntries(
      Array.isArray(props.state?.login_record) ? props.state.login_record : [],
    );
  }, [props.state?.login_record]);

  const isVisitLogOwner =
    String(props.state?.username || "").toLowerCase() === "rudyhamame";

  const loginRecords = Array.isArray(loginLogEntries)
    ? [...loginLogEntries]
        .sort(
          (firstRecord, secondRecord) =>
            new Date(secondRecord.loggedInAt || 0).getTime() -
            new Date(firstRecord.loggedInAt || 0).getTime(),
        )
        .slice(0, 20)
    : [];

  const activeLoginRecord =
    loginRecords.length > 0 ? loginRecords[loginLogIndex] : null;
  const activeVisitLogRecord =
    visitLogEntries.length > 0 ? visitLogEntries[visitLogIndex] : null;
  const isNogaPlanOwner =
    String(props.state?.username || "").toLowerCase() === "naghamtrkmani";
  const schoolPlannerPath = isNogaPlanOwner
    ? "/phenomed/schoolplanner/nogaplan"
    : "/phenomed/schoolplanner";
  const schoolPlannerLabel = isNogaPlanOwner ? "Noga Plan" : "School Planner";
  const imageGallery = Array.isArray(props.state?.imageGallery)
    ? props.state.imageGallery
    : [];
  const imageOnlyGallery = React.useMemo(
    () => imageGallery.filter((item) => !isVideoGalleryItem(item)),
    [imageGallery],
  );
  const profilePictureSrc = String(props.state?.profilePicture || "").trim();
  const activeGalleryImage = imageOnlyGallery[activeGalleryImageIndex] || null;
  const socialFriends = Array.isArray(props.state?.friends)
    ? [...props.state.friends]
        .filter((friend) => friend && typeof friend === "object" && friend.info)
        .map((friend) => {
          const firstName = String(friend.info?.firstname || "").trim();
          const lastName = String(friend.info?.lastname || "").trim();
          const username = String(friend.info?.username || "").trim();
          const displayName =
            `${firstName} ${lastName}`.trim() || username || "Doctor";
          const initials =
            `${firstName.charAt(0) || displayName.charAt(0) || "D"}${
              lastName.charAt(0) || username.charAt(0) || ""
            }`.toUpperCase();

          return {
            id: String(friend._id || username || displayName).trim(),
            displayName,
            initials: initials || "D",
            username,
            avatarUrl: String(
              friend?.media?.profilePicture?.url ||
                friend?.profilePicture ||
                friend?.info?.profilePicture ||
                "",
            ).trim(),
            isConnected: Boolean(friend.status?.isConnected),
          };
        })
        .sort((firstFriend, secondFriend) => {
          if (firstFriend.isConnected !== secondFriend.isConnected) {
            return (
              Number(secondFriend.isConnected) - Number(firstFriend.isConnected)
            );
          }

          return firstFriend.displayName.localeCompare(
            secondFriend.displayName,
          );
        })
    : [];
  const getFriendStatusColor = (isConnected) =>
    props.friendConnectionColor
      ? props.friendConnectionColor(isConnected)
      : isConnected
        ? "#32cd32"
        : "rgba(240, 242, 245, 0.42)";

  const openProfilePicturePicker = () => {
    galleryUploadInputRef.current?.click();
  };

  const clampProfilePictureViewport = React.useCallback((nextViewport) => {
    const rawScale = Number(nextViewport?.scale);
    const rawOffsetX = Number(nextViewport?.offsetX);
    const rawOffsetY = Number(nextViewport?.offsetY);
    const scale = Number.isFinite(rawScale)
      ? Math.min(Math.max(rawScale, 1), 4)
      : 1;
    const offsetX = Number.isFinite(rawOffsetX) ? rawOffsetX : 0;
    const offsetY = Number.isFinite(rawOffsetY) ? rawOffsetY : 0;

    const wrapperBounds =
      profilePictureWrapperRef.current?.getBoundingClientRect();

    if (!wrapperBounds?.width || !wrapperBounds?.height || scale <= 1) {
      return {
        scale,
        offsetX: scale <= 1 ? 0 : offsetX,
        offsetY: scale <= 1 ? 0 : offsetY,
      };
    }

    const maxOffsetX = ((scale - 1) * wrapperBounds.width) / 2;
    const maxOffsetY = ((scale - 1) * wrapperBounds.height) / 2;

    return {
      scale,
      offsetX: Math.min(Math.max(offsetX, -maxOffsetX), maxOffsetX),
      offsetY: Math.min(Math.max(offsetY, -maxOffsetY), maxOffsetY),
    };
  }, []);

  const getTouchDistance = (touchA, touchB) =>
    Math.hypot(
      touchA.clientX - touchB.clientX,
      touchA.clientY - touchB.clientY,
    );

  const handleProfilePictureTouchStart = (event) => {
    if (!profilePictureSrc) {
      return;
    }

    const touches = event.touches;

    if (touches.length >= 2) {
      profilePictureGestureRef.current = {
        ...profilePictureGestureRef.current,
        mode: "pinch",
        startDistance: getTouchDistance(touches[0], touches[1]),
        startScale: profilePictureViewport.scale,
      };
      return;
    }

    if (touches.length === 1) {
      profilePictureGestureRef.current = {
        ...profilePictureGestureRef.current,
        mode: "pan",
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        startOffsetX: profilePictureViewport.offsetX,
        startOffsetY: profilePictureViewport.offsetY,
      };
    }
  };

  const handleProfilePictureTouchMove = (event) => {
    if (!profilePictureSrc) {
      return;
    }

    const gesture = profilePictureGestureRef.current;

    if (gesture.mode === "pinch" && event.touches.length >= 2) {
      event.preventDefault();
      const nextDistance = getTouchDistance(event.touches[0], event.touches[1]);
      const ratio =
        gesture.startDistance > 0 ? nextDistance / gesture.startDistance : 1;
      const nextScale = Math.min(Math.max(gesture.startScale * ratio, 1), 4);

      setProfilePictureViewport((currentViewport) =>
        clampProfilePictureViewport({
          ...currentViewport,
          scale: nextScale,
        }),
      );
      return;
    }

    if (gesture.mode === "pan" && event.touches.length === 1) {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - gesture.startX;
      const deltaY = event.touches[0].clientY - gesture.startY;

      setProfilePictureViewport((currentViewport) =>
        clampProfilePictureViewport({
          ...currentViewport,
          offsetX: gesture.startOffsetX + deltaX,
          offsetY: gesture.startOffsetY + deltaY,
        }),
      );
    }
  };

  const handleProfilePictureTouchEnd = (event) => {
    if (event.touches.length >= 2) {
      profilePictureGestureRef.current.mode = "pinch";
      profilePictureGestureRef.current.startDistance = getTouchDistance(
        event.touches[0],
        event.touches[1],
      );
      profilePictureGestureRef.current.startScale =
        profilePictureViewport.scale;
      return;
    }

    if (event.touches.length === 1) {
      profilePictureGestureRef.current.mode = "pan";
      profilePictureGestureRef.current.startX = event.touches[0].clientX;
      profilePictureGestureRef.current.startY = event.touches[0].clientY;
      profilePictureGestureRef.current.startOffsetX =
        profilePictureViewport.offsetX;
      profilePictureGestureRef.current.startOffsetY =
        profilePictureViewport.offsetY;
      return;
    }

    profilePictureGestureRef.current.mode = "idle";
  };

  const handleProfilePicturePointerDown = (event) => {
    if (!profilePictureSrc || event.pointerType === "touch") {
      return;
    }

    profilePictureGestureRef.current = {
      ...profilePictureGestureRef.current,
      mode: "pointer-pan",
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: profilePictureViewport.offsetX,
      startOffsetY: profilePictureViewport.offsetY,
    };

    setIsProfilePictureDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleProfilePicturePointerMove = (event) => {
    if (!profilePictureSrc) {
      return;
    }

    const gesture = profilePictureGestureRef.current;
    if (gesture.mode !== "pointer-pan") {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    setProfilePictureViewport((currentViewport) =>
      clampProfilePictureViewport({
        ...currentViewport,
        offsetX: gesture.startOffsetX + deltaX,
        offsetY: gesture.startOffsetY + deltaY,
      }),
    );
  };

  const handleProfilePicturePointerUp = (event) => {
    if (profilePictureGestureRef.current.mode === "pointer-pan") {
      profilePictureGestureRef.current.mode = "idle";
      setIsProfilePictureDragging(false);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const handleProfilePictureWheel = (event) => {
    if (!profilePictureSrc) {
      return;
    }

    event.preventDefault();
    const zoomStep = event.deltaY < 0 ? 0.08 : -0.08;

    setProfilePictureViewport((currentViewport) =>
      clampProfilePictureViewport({
        ...currentViewport,
        scale: Math.min(Math.max(currentViewport.scale + zoomStep, 1), 4),
      }),
    );
  };

  const resetProfilePictureViewport = () => {
    setProfilePictureViewport(
      clampProfilePictureViewport({
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      }),
    );
  };

  const sendCloudinaryReply = (message) => {
    const nextMessage = String(message || "").trim();
    if (!nextMessage) {
      return;
    }

    props.serverReply?.(nextMessage);
  };

  const syncUserMediaState = (payload = {}, options = {}) => {
    const keepCurrentProfilePicture = Boolean(
      options?.keepCurrentProfilePicture,
    );

    props.setUserMediaInfo?.({
      profilePicture: keepCurrentProfilePicture
        ? String(props.state?.profilePicture || "").trim()
        : String(payload?.profilePicture?.url || "").trim(),
      imageGallery: Array.isArray(payload?.imageGallery)
        ? payload.imageGallery
        : [],
    });
  };

  const openGalleryViewer = (publicId = "") => {
    const targetPublicId = String(publicId || "").trim();
    if (!imageOnlyGallery.length) {
      return;
    }

    const nextIndex = targetPublicId
      ? imageOnlyGallery.findIndex(
          (image) => image?.publicId === targetPublicId,
        )
      : imageOnlyGallery.findIndex((image) => image?.url === profilePictureSrc);

    setActiveGalleryImageIndex(nextIndex >= 0 ? nextIndex : 0);
    setIsImageViewerOpen(true);
    setActiveGalleryActionsPublicId("");
  };

  const toggleGalleryItemActions = (publicId) => {
    const nextPublicId = String(publicId || "").trim();

    if (!nextPublicId) {
      return;
    }

    setActiveGalleryActionsPublicId((currentPublicId) =>
      currentPublicId === nextPublicId ? "" : nextPublicId,
    );
  };

  const uploadGalleryImage = async (selectedFile, options = {}) => {
    if (!selectedFile || !props.state?.token) {
      return;
    }

    // Enforce 100MB max video file size before upload, with auto-compression
    const maxVideoSizeBytes = 100 * 1024 * 1024;
    const preCheckMimeType = String(selectedFile?.type || "").trim();
    const isVideoFilePre = preCheckMimeType.toLowerCase().startsWith("video/");
    let fileToUploadPre = selectedFile;
    if (isVideoFilePre && selectedFile.size > maxVideoSizeBytes) {
      sendCloudinaryReply(
        `Video file is too large (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB). Compressing before upload...`,
      );
      try {
        fileToUploadPre = await compressVideo(selectedFile);
        sendCloudinaryReply(
          `Compressed video size: ${(fileToUploadPre.size / 1024 / 1024).toFixed(2)}MB.`,
        );
        if (fileToUploadPre.size > maxVideoSizeBytes) {
          sendCloudinaryReply(
            `Compressed video is still too large (${(fileToUploadPre.size / 1024 / 1024).toFixed(2)}MB). The maximum allowed size is 100MB. Please select a shorter video.`,
          );
          return;
        }
      } catch (compressionError) {
        sendCloudinaryReply(
          `Video compression failed: ${compressionError?.message || "Unknown error."}`,
        );
        return;
      }
    }

    const existingUploadTask = options?.uploadTask || null;
    // Use the possibly compressed file
    const fileToUploadFinal = fileToUploadPre;
    const fileName = String(
      existingUploadTask?.fileName ||
        fileToUploadFinal?.name ||
        "gallery-upload",
    ).trim();
    const mimeType = String(
      existingUploadTask?.mimeType || fileToUploadFinal?.type || "",
    ).trim();
    const isVideoFile = mimeType.toLowerCase().startsWith("video/");
    const resourceType =
      existingUploadTask?.resourceType || (isVideoFile ? "video" : "image");
    const publicId =
      String(existingUploadTask?.publicId || "").trim() ||
      sanitizeGalleryFileName(fileName);
    const uploadTaskId =
      String(existingUploadTask?.id || "").trim() ||
      `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const uploadTask = existingUploadTask || {
      id: uploadTaskId,
      file: fileToUploadFinal,
      fileName,
      mimeType,
      resourceType,
      publicId,
      createdAt: new Date().toISOString(),
      fileSize: Number(fileToUploadFinal?.size) || 0,
      lastModified: Number(fileToUploadFinal?.lastModified) || 0,
    };

    if (!existingUploadTask) {
      try {
        await savePendingGalleryUpload(uploadTask);
      } catch (error) {
        // Continue upload even if local persistence is unavailable.
      }
    }

    setIsImageGalleryUploading(true);

    let triedCompression = false;
    let fileToUpload = selectedFile;

    while (true) {
      try {
        const signatureResponse = await fetch(
          apiUrl("/api/user/image-gallery/signature"),
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${props.state.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              publicId,
              resourceType,
            }),
          },
        );
        const signaturePayload = await signatureResponse
          .json()
          .catch(() => ({}));

        if (!signatureResponse.ok) {
          throw new Error(
            signaturePayload?.message || "Unable to prepare media upload.",
          );
        }

        const cloudinaryBody = new FormData();
        cloudinaryBody.append("file", fileToUpload);
        cloudinaryBody.append("api_key", signaturePayload.apiKey);
        cloudinaryBody.append("timestamp", String(signaturePayload.timestamp));
        cloudinaryBody.append("signature", signaturePayload.signature);
        cloudinaryBody.append("folder", signaturePayload.folder);
        cloudinaryBody.append("public_id", signaturePayload.publicId);

        const cloudinaryResponse = await fetch(signaturePayload.uploadUrl, {
          method: "POST",
          body: cloudinaryBody,
        });
        const cloudinaryPayload = await cloudinaryResponse
          .json()
          .catch(() => ({}));

        if (!cloudinaryResponse.ok) {
          // Check for 413/403 error and only try compression once
          const errorMsg =
            cloudinaryPayload?.error?.message || "Media upload failed.";
          const status = cloudinaryResponse.status;
          if (
            isVideoFile &&
            !triedCompression &&
            (status === 413 ||
              status === 403 ||
              /file too large|413|too large|exceeds|limit/i.test(errorMsg))
          ) {
            sendCloudinaryReply(
              `Video too large (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB), compressing and retrying upload...`,
            );
            try {
              fileToUpload = await compressVideo(fileToUpload);
              triedCompression = true;
              sendCloudinaryReply(
                `Compressed video size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB. Retrying upload...`,
              );
              continue; // Retry upload with compressed video
            } catch (compressionError) {
              throw new Error(
                "Video compression failed: " +
                  (compressionError?.message || "Unknown error."),
              );
            }
          }
          sendCloudinaryReply(
            `Upload failed with status ${status}: ${errorMsg}`,
          );
          throw new Error(errorMsg);
        }

        const saveResponse = await fetch(apiUrl("/api/user/image-gallery"), {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${props.state.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: cloudinaryPayload.secure_url,
            publicId: cloudinaryPayload.public_id,
            assetId: cloudinaryPayload.asset_id,
            folder: cloudinaryPayload.folder,
            resourceType: cloudinaryPayload.resource_type || resourceType,
            mimeType,
            width: cloudinaryPayload.width,
            height: cloudinaryPayload.height,
            format: cloudinaryPayload.format,
            bytes: cloudinaryPayload.bytes,
            duration: cloudinaryPayload.duration,
            createdAt: new Date().toISOString(),
          }),
        });
        const savePayload = await saveResponse.json().catch(() => ({}));

        if (!saveResponse.ok) {
          throw new Error(
            savePayload?.message || "Unable to save uploaded media.",
          );
        }

        syncUserMediaState(savePayload, {
          keepCurrentProfilePicture: true,
        });
        try {
          await deletePendingGalleryUpload(uploadTask.id);
        } catch (error) {
          // Ignore local cleanup failures after successful server save.
        }
        sendCloudinaryReply(
          savePayload?.message || "Media saved to Cloudinary.",
        );
        break; // Success, exit loop
      } catch (error) {
        if (
          isVideoFile &&
          !triedCompression &&
          /413|file too large|too large|exceeds|limit/i.test(
            error?.message || "",
          )
        ) {
          sendCloudinaryReply(
            `Video too large (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB), compressing and retrying upload...`,
          );
          try {
            fileToUpload = await compressVideo(fileToUpload);
            triedCompression = true;
            sendCloudinaryReply(
              `Compressed video size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB. Retrying upload...`,
            );
            continue; // Retry upload with compressed video
          } catch (compressionError) {
            sendCloudinaryReply(
              "Video compression failed: " +
                (compressionError?.message || "Unknown error."),
            );
            break;
          }
        } else {
          sendCloudinaryReply(
            error?.message ||
              "Cloudinary upload paused. It will retry after refresh.",
          );
          break;
        }
      } finally {
        setIsImageGalleryUploading(false);
      }
    }
  };

  const handleProfilePictureSelected = async (event) => {
    const selectedFile = event.target?.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    await uploadGalleryImage(selectedFile);
  };

  const handleDeleteGalleryImage = async (publicId) => {
    const nextPublicId = String(publicId || "").trim();

    if (!nextPublicId || !props.state?.token) {
      return;
    }

    setIsImageGalleryDeletingPublicId(nextPublicId);

    try {
      const response = await fetch(apiUrl("/api/user/image-gallery"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicId: nextPublicId,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to delete image.");
      }

      syncUserMediaState(payload);
      sendCloudinaryReply(
        payload?.message || "Image deleted from Cloudinary gallery.",
      );
      if (isImageViewerOpen) {
        setIsImageViewerOpen(false);
      }
    } catch (error) {
      sendCloudinaryReply(
        error?.message || "Cloudinary delete failed. Please try again.",
      );
    } finally {
      setIsImageGalleryDeletingPublicId("");
    }
  };

  const handleSetGalleryImageAsProfilePicture = async (publicId) => {
    const nextPublicId = String(publicId || "").trim();

    if (!nextPublicId || !props.state?.token) {
      return;
    }

    setIsImageGallerySettingProfilePublicId(nextPublicId);

    try {
      const response = await fetch(
        apiUrl("/api/user/image-gallery/profile-picture"),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${props.state.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publicId: nextPublicId,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to set profile picture.");
      }

      syncUserMediaState(payload);
      sendCloudinaryReply(payload?.message || "Profile picture updated.");
    } catch (error) {
      sendCloudinaryReply(error?.message || "Unable to set profile picture.");
    } finally {
      setIsImageGallerySettingProfilePublicId("");
    }
  };

  const handleClearPendingUploads = async () => {
    setClearPendingFeedback("");

    try {
      const clearedCount = await clearPendingGalleryUploads();
      const message =
        clearedCount > 0
          ? `Cleared ${clearedCount} pending upload${clearedCount === 1 ? "" : "s"}.`
          : "No pending uploads were stored.";

      setClearPendingFeedback(message);
      sendCloudinaryReply(message);
    } catch (error) {
      const message =
        error?.message || "Unable to clear pending uploads right now.";

      setClearPendingFeedback(message);
      sendCloudinaryReply(message);
    }
  };

  React.useEffect(() => {
    if (!props.state?.token || hasRecoveredPendingUploadsRef.current) {
      return;
    }

    hasRecoveredPendingUploadsRef.current = true;
    let isCancelled = false;

    const resumePendingUploads = async () => {
      let pendingUploads = [];
      try {
        pendingUploads = await getPendingGalleryUploads();
      } catch (error) {
        return;
      }

      if (!pendingUploads.length || isCancelled) {
        return;
      }

      sendCloudinaryReply(
        `Resuming ${pendingUploads.length} pending media upload${pendingUploads.length === 1 ? "" : "s"}.`,
      );

      for (const pendingUpload of pendingUploads) {
        if (isCancelled) {
          break;
        }

        const pendingFile = pendingUpload?.file;
        if (!(pendingFile instanceof Blob)) {
          try {
            await deletePendingGalleryUpload(pendingUpload?.id);
          } catch (error) {
            // Ignore invalid local queue cleanup errors.
          }
          continue;
        }

        await uploadGalleryImage(pendingFile, {
          uploadTask: pendingUpload,
        });
      }
    };

    resumePendingUploads();

    return () => {
      isCancelled = true;
    };
  }, [props.state?.token]);

  React.useEffect(() => {
    if (!imageOnlyGallery.length) {
      if (activeGalleryImageIndex !== 0) {
        setActiveGalleryImageIndex(0);
      }
      if (isImageViewerOpen) {
        setIsImageViewerOpen(false);
      }
      return;
    }

    if (activeGalleryImageIndex > imageOnlyGallery.length - 1) {
      setActiveGalleryImageIndex(imageOnlyGallery.length - 1);
    }
  }, [activeGalleryImageIndex, imageOnlyGallery.length, isImageViewerOpen]);

  React.useEffect(() => {
    if (!activeGalleryActionsPublicId) {
      return;
    }

    const hasActiveImage = imageGallery.some(
      (image) => String(image?.publicId || "") === activeGalleryActionsPublicId,
    );

    if (!hasActiveImage) {
      setActiveGalleryActionsPublicId("");
    }
  }, [activeGalleryActionsPublicId, imageGallery]);

  React.useEffect(() => {
    if (loginRecords.length === 0) {
      if (loginLogIndex !== 0) {
        setLoginLogIndex(0);
      }
      return;
    }

    if (loginLogIndex > loginRecords.length - 1) {
      setLoginLogIndex(loginRecords.length - 1);
    }
  }, [loginLogIndex, loginRecords.length]);

  React.useEffect(() => {
    if (visitLogEntries.length === 0) {
      if (visitLogIndex !== 0) {
        setVisitLogIndex(0);
      }
      return;
    }

    if (visitLogIndex > visitLogEntries.length - 1) {
      setVisitLogIndex(visitLogEntries.length - 1);
    }
  }, [visitLogEntries.length, visitLogIndex]);

  React.useEffect(() => {
    if (!isVisitLogOwner || !props.state?.token) {
      setVisitLogEntries([]);
      setVisitLogError("");
      setIsVisitLogLoading(false);
      return;
    }

    let isMounted = true;
    setIsVisitLogLoading(true);
    setVisitLogError("");

    fetch(apiUrl("/api/user/visit-log"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${props.state.token}`,
      },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load the visit log right now.",
          );
        }

        return payload;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setVisitLogEntries(
          Array.isArray(payload?.visitLog) ? payload.visitLog : [],
        );
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setVisitLogError(
          error?.message || "Unable to load the visit log right now.",
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsVisitLogLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isVisitLogOwner, props.state?.token, props.state?.visitLogRefreshToken]);

  React.useEffect(() => {
    if (!isVisitLogOwner) {
      return;
    }

    let isMounted = true;
    const hydrateFromStoredCourses = () => {
      try {
        const storedCourses = JSON.parse(
          window.localStorage.getItem(NAGHAM_COURSE_LIST_STORAGE_KEY) || "[]",
        );

        if (isMounted && Array.isArray(storedCourses)) {
          setNaghamCourseOptions(storedCourses);
        }
      } catch (error) {
        if (isMounted) {
          setNaghamCourseOptions([]);
        }
      }
    };

    hydrateFromStoredCourses();

    fetch(apiUrl("/api/user/profile/naghamtrkmani"), {
      method: "GET",
      headers: props.state?.token
        ? {
            Authorization: `Bearer ${props.state.token}`,
          }
        : undefined,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load Nagham courses.");
        }

        return payload;
      })
      .then((payload) => {
        const rawCourses =
          payload?.schoolPlanner?.courses ||
          payload?.user?.schoolPlanner?.courses ||
          payload?.profile?.schoolPlanner?.courses ||
          [];

        const normalizedCourses = Array.isArray(rawCourses)
          ? rawCourses
              .filter((course) => course?._id && course?.course_name)
              .map((course) => ({
                id: course._id,
                name: course.course_name,
              }))
          : [];

        if (!isMounted || normalizedCourses.length === 0) {
          return;
        }

        window.localStorage.setItem(
          NAGHAM_COURSE_LIST_STORAGE_KEY,
          JSON.stringify(normalizedCourses),
        );
        setNaghamCourseOptions(normalizedCourses);
      })
      .catch(() => {
        hydrateFromStoredCourses();
      });

    return () => {
      isMounted = false;
    };
  }, [isVisitLogOwner, props.state?.token]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY,
      schoolPlannerReducedMotion ? "true" : "false",
    );
  }, [schoolPlannerReducedMotion]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      PHENOMEDSOCIAL_CHAT_BG_STORAGE_KEY,
      String(phenomedSocialChatBackground || "").trim(),
    );
  }, [phenomedSocialChatBackground]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      HOME_PROFILE_PIC_VIEWPORT_STORAGE_KEY,
      JSON.stringify(profilePictureViewport),
    );
  }, [profilePictureViewport]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const clampCurrentViewport = () => {
      setProfilePictureViewport((currentViewport) => {
        const nextViewport = clampProfilePictureViewport(currentViewport);

        if (
          nextViewport.scale === currentViewport.scale &&
          nextViewport.offsetX === currentViewport.offsetX &&
          nextViewport.offsetY === currentViewport.offsetY
        ) {
          return currentViewport;
        }

        return nextViewport;
      });
    };

    clampCurrentViewport();
    window.addEventListener("resize", clampCurrentViewport);

    return () => {
      window.removeEventListener("resize", clampCurrentViewport);
    };
  }, [clampProfilePictureViewport, profilePictureSrc]);

  React.useEffect(() => {
    if (!isVisitLogOwner) {
      return;
    }

    if (naghamCourseOptions.length === 0) {
      setSelectedNaghamCourseId("");
      setNaghamCourseLetterInput("");
      return;
    }

    const activeCourseId = naghamCourseOptions.some(
      (course) => course.id === selectedNaghamCourseId,
    )
      ? selectedNaghamCourseId
      : naghamCourseOptions[0].id;

    if (activeCourseId !== selectedNaghamCourseId) {
      setSelectedNaghamCourseId(activeCourseId);
      return;
    }

    setNaghamCourseLetterInput(
      naghamCourseLetters[activeCourseId] || DEFAULT_NAGHAM_COURSE_LETTER,
    );
  }, [
    isVisitLogOwner,
    naghamCourseLetters,
    naghamCourseOptions,
    selectedNaghamCourseId,
  ]);

  React.useEffect(() => {
    if (!props.state?.token) {
      return;
    }

    let isMounted = true;

    fetch(apiUrl("/api/telegram/config"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${props.state.token}`,
      },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load Telegram config status.",
          );
        }

        return payload;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setTelegramConfigStatus({
          configured: Boolean(payload?.configured),
          hasApiId: Boolean(payload?.hasApiId),
          hasApiHash: Boolean(payload?.hasApiHash),
          hasStringSession: Boolean(payload?.hasStringSession),
          groupReference: String(payload?.groupReference || ""),
        });
        setSchoolPlannerTelegramGroupInput(
          String(payload?.groupReference || ""),
        );
        setTelegramAuthStage(payload?.hasStringSession ? "connected" : "idle");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setTelegramConfigFeedback(
          error?.message || "Unable to load Telegram config status.",
        );
      });

    return () => {
      isMounted = false;
    };
  }, [props.state?.token]);

  const updatePasswordField = (event) => {
    const { name, value } = event.target;
    setPasswordFields((currentFields) => ({
      ...currentFields,
      [name]: value,
    }));
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    if (!props.state?.token) {
      setPasswordFeedback({
        tone: "error",
        message: "You need to be logged in to change the password.",
      });
      return;
    }

    if (!passwordFields.currentPassword || !passwordFields.newPassword) {
      setPasswordFeedback({
        tone: "error",
        message: "Please fill in the current and new password.",
      });
      return;
    }

    if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      setPasswordFeedback({
        tone: "error",
        message: "The new password and confirmation do not match.",
      });
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordFeedback({
      tone: "",
      message: "",
    });

    try {
      const response = await fetch(apiUrl("/api/user/change-password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${props.state.token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordFields.currentPassword,
          newPassword: passwordFields.newPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to change the password right now.",
        );
      }

      setPasswordFields({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordFeedback({
        tone: "success",
        message: payload?.message || "Password changed successfully.",
      });
      setIsPasswordFormOpen(false);
    } catch (error) {
      setPasswordFeedback({
        tone: "error",
        message: error?.message || "Unable to change the password right now.",
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const clearVisitLog = async () => {
    if (!isVisitLogOwner || !props.state?.token || isVisitLogDeleting) {
      return;
    }

    const shouldDelete = window.confirm(
      "Do you want to delete all visit log entries?",
    );

    if (!shouldDelete) {
      return;
    }

    setIsVisitLogDeleting(true);
    setVisitLogError("");

    try {
      const response = await fetch(apiUrl("/api/user/visit-log"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete the visit log right now.",
        );
      }

      setVisitLogEntries([]);
      setVisitLogIndex(0);
    } catch (error) {
      setVisitLogError(
        error?.message || "Unable to delete the visit log right now.",
      );
    } finally {
      setIsVisitLogDeleting(false);
    }
  };

  const clearLoginLog = async () => {
    if (!props.state?.token || isLoginLogDeleting) {
      return;
    }

    const shouldDelete = window.confirm(
      "Do you want to delete all login log entries?",
    );

    if (!shouldDelete) {
      return;
    }

    setIsLoginLogDeleting(true);
    setLoginLogError("");

    try {
      const response = await fetch(apiUrl("/api/user/login-log"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete the login log right now.",
        );
      }

      setLoginLogEntries([]);
      setLoginLogIndex(0);
    } catch (error) {
      setLoginLogError(
        error?.message || "Unable to delete the login log right now.",
      );
    } finally {
      setIsLoginLogDeleting(false);
    }
  };

  const saveNaghamCourseLetter = () => {
    if (!selectedNaghamCourseId) {
      setNaghamCourseLetterFeedback("Choose a course first.");
      return;
    }

    const nextLetter =
      String(naghamCourseLetterInput || "").trim() ||
      DEFAULT_NAGHAM_COURSE_LETTER;
    const nextLetters = {
      ...naghamCourseLetters,
      [selectedNaghamCourseId]: nextLetter,
    };

    window.localStorage.setItem(
      NAGHAM_COURSE_LETTERS_STORAGE_KEY,
      JSON.stringify(nextLetters),
    );
    setNaghamCourseLetters(nextLetters);
    setNaghamCourseLetterInput(nextLetter);
    setNaghamCourseLetterFeedback("Saved for the selected Nagham course.");
  };

  const saveMusicArchivePlaylist = () => {
    if (typeof window === "undefined") {
      return;
    }

    const normalizedIdentifiers = Array.from(
      new Set(
        String(musicArchivePlaylistInput || "")
          .split("\n")
          .map((identifier) => identifier.trim())
          .filter(Boolean),
      ),
    );

    const nextIdentifiers =
      normalizedIdentifiers.length > 0
        ? normalizedIdentifiers
        : DEFAULT_ARCHIVE_MUSIC_IDENTIFIERS;

    window.localStorage.setItem(
      SCHOOLPLANNER_MUSIC_STORAGE_KEY,
      JSON.stringify(nextIdentifiers),
    );
    setMusicArchivePlaylistInput(nextIdentifiers.join("\n"));
    setMusicArchivePlaylistFeedback("Saved Internet Archive playlist.");
  };

  const searchMusicArchiveSongs = async () => {
    const normalizedQuery = String(musicArchiveSearchQuery || "").trim();

    if (!normalizedQuery) {
      setMusicArchiveSearchResults([]);
      setMusicArchiveSearchFeedback("Type a song name first.");
      return;
    }

    setIsMusicArchiveSearching(true);
    setMusicArchiveSearchFeedback("");

    try {
      const response = await fetch(
        buildInternetArchiveSearchUrl(normalizedQuery),
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error("Unable to search songs right now.");
      }

      const nextResults = Array.isArray(payload?.response?.docs)
        ? payload.response.docs
            .map((item) => ({
              identifier: String(item?.identifier || "").trim(),
              title: String(item?.title || item?.identifier || "").trim(),
              creator: Array.isArray(item?.creator)
                ? item.creator.join(", ")
                : String(item?.creator || "Internet Archive").trim(),
            }))
            .filter((item) => item.identifier)
        : [];

      setMusicArchiveSearchResults(nextResults);
      setMusicArchiveSearchFeedback(
        nextResults.length > 0 ? "" : "No matching songs found.",
      );
    } catch (error) {
      setMusicArchiveSearchResults([]);
      setMusicArchiveSearchFeedback(
        error?.message || "Unable to search songs right now.",
      );
    } finally {
      setIsMusicArchiveSearching(false);
    }
  };

  const addMusicArchiveSong = (identifier) => {
    const normalizedIdentifier = String(identifier || "").trim();

    if (!normalizedIdentifier) {
      return;
    }

    const existingIdentifiers = Array.from(
      new Set(
        String(musicArchivePlaylistInput || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    if (existingIdentifiers.includes(normalizedIdentifier)) {
      setMusicArchivePlaylistFeedback("Song is already in the playlist.");
      return;
    }

    const nextIdentifiers = [...existingIdentifiers, normalizedIdentifier];
    setMusicArchivePlaylistInput(nextIdentifiers.join("\n"));
    setMusicArchivePlaylistFeedback("Song added to the playlist.");
  };

  const saveSchoolPlannerTelegramSettings = () => {
    if (!props.state?.token) {
      return;
    }

    const normalizedGroup = String(
      schoolPlannerTelegramGroupInput || "",
    ).trim();

    fetch(apiUrl("/api/telegram/config"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.state.token}`,
      },
      body: JSON.stringify({
        groupReference: normalizedGroup,
      }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to save Telegram link settings.",
          );
        }

        setTelegramConfigStatus((currentStatus) => ({
          ...currentStatus,
          configured: Boolean(payload?.configured),
          hasApiId: Boolean(payload?.hasApiId),
          hasApiHash: Boolean(payload?.hasApiHash),
          hasStringSession: Boolean(payload?.hasStringSession),
          groupReference: String(payload?.groupReference || ""),
        }));
        setSchoolPlannerTelegramGroupInput(
          String(payload?.groupReference || ""),
        );
        setSchoolPlannerTelegramFeedback(
          payload?.message || "Saved SchoolPlanner Telegram settings.",
        );
      })
      .catch((error) => {
        setSchoolPlannerTelegramFeedback(
          error?.message || "Unable to save Telegram settings.",
        );
      });
  };

  const startTelegramAuth = async () => {
    if (!props.state?.token) {
      return;
    }

    const apiId = String(telegramApiIdInput || "").trim();
    const apiHash = String(telegramApiHashInput || "").trim();
    const phoneNumber = String(telegramPhoneNumberInput || "").trim();

    if (!apiId || !apiHash || !phoneNumber) {
      setTelegramConfigFeedback(
        "Please fill Telegram API ID, API Hash, and phone number.",
      );
      return;
    }

    try {
      setTelegramAuthStage("idle");
      setTelegramPhoneCodeInput("");
      setTelegramPasswordInput("");
      const response = await fetch(apiUrl("/api/telegram/auth/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${props.state.token}`,
        },
        body: JSON.stringify({
          apiId,
          apiHash,
          phoneNumber,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to start Telegram login.");
      }

      setTelegramAuthStage("code");
      setTelegramConfigFeedback(
        payload?.message || "Telegram login code sent.",
      );
    } catch (error) {
      setTelegramAuthStage("idle");
      setTelegramConfigFeedback(
        error?.message || "Unable to start Telegram login.",
      );
    }
  };

  const verifyTelegramCode = async () => {
    if (!props.state?.token) {
      return;
    }

    const phoneCode = String(telegramPhoneCodeInput || "").trim();

    if (!phoneCode) {
      setTelegramConfigFeedback("Please enter the Telegram login code.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/telegram/auth/verify-code"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${props.state.token}`,
        },
        body: JSON.stringify({
          phoneCode,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to verify Telegram code.");
      }

      if (payload?.requiresPassword) {
        setTelegramAuthStage("password");
      } else {
        setTelegramAuthStage("connected");
        setTelegramConfigStatus((currentStatus) => ({
          ...currentStatus,
          configured: Boolean(payload?.configured),
          hasApiId: Boolean(payload?.hasApiId),
          hasApiHash: Boolean(payload?.hasApiHash),
          hasStringSession: Boolean(payload?.hasStringSession),
        }));
      }

      setTelegramConfigFeedback(payload?.message || "Telegram code verified.");
      setTelegramPhoneCodeInput("");
    } catch (error) {
      setTelegramAuthStage("code");
      setTelegramConfigFeedback(
        error?.message || "Unable to verify Telegram code.",
      );
    }
  };

  const verifyTelegramPassword = async () => {
    if (!props.state?.token) {
      return;
    }

    const password = String(telegramPasswordInput || "");

    if (!password.trim()) {
      setTelegramConfigFeedback(
        "Please enter the Telegram 2-step verification password.",
      );
      return;
    }

    try {
      const response = await fetch(
        apiUrl("/api/telegram/auth/verify-password"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${props.state.token}`,
          },
          body: JSON.stringify({
            password,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to verify Telegram password.",
        );
      }

      setTelegramAuthStage("connected");
      setTelegramConfigStatus((currentStatus) => ({
        ...currentStatus,
        configured: Boolean(payload?.configured),
        hasApiId: Boolean(payload?.hasApiId),
        hasApiHash: Boolean(payload?.hasApiHash),
        hasStringSession: Boolean(payload?.hasStringSession),
      }));
      setTelegramConfigFeedback(
        payload?.message || "Telegram connected successfully.",
      );
      setTelegramPasswordInput("");
    } catch (error) {
      setTelegramAuthStage("password");
      setTelegramConfigFeedback(
        error?.message || "Unable to verify Telegram password.",
      );
    }
  };

  const updateAcademicInfoField = (event) => {
    const { name, value } = event.target;

    setAcademicInfoFields((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAcademicInfoSave = async (event) => {
    event.preventDefault();

    if (!props.state?.token) {
      return;
    }

    setIsAcademicInfoSubmitting(true);
    setAcademicInfoFeedback({
      tone: "",
      message: "",
    });

    try {
      const response = await fetch(apiUrl("/api/user/profile"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstname: String(props.state?.firstname || "").trim(),
          lastname: String(props.state?.lastname || "").trim(),
          username: String(props.state?.username || "").trim(),
          program: academicInfoFields.program,
          university: academicInfoFields.university,
          studyYear: academicInfoFields.studyYear,
          term: academicInfoFields.term,
          aiProvider: String(props.state?.aiProvider || "openai").trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to update personal information.",
        );
      }

      const nextInfo = payload?.info || {};

      props.setUserAcademicInfo?.({
        firstname: nextInfo?.firstname || props.state?.firstname || "",
        lastname: nextInfo?.lastname || props.state?.lastname || "",
        username: nextInfo?.username || props.state?.username || "",
        program: nextInfo?.program || academicInfoFields.program,
        university: nextInfo?.university || academicInfoFields.university,
        studyYear: nextInfo?.studyYear || academicInfoFields.studyYear,
        term: nextInfo?.term || academicInfoFields.term,
        aiProvider:
          nextInfo?.aiProvider || String(props.state?.aiProvider || "openai"),
      });
      setAcademicInfoFields({
        program: nextInfo?.program || academicInfoFields.program,
        university: nextInfo?.university || academicInfoFields.university,
        studyYear: nextInfo?.studyYear || academicInfoFields.studyYear,
        term: nextInfo?.term || academicInfoFields.term,
      });
      setIsAcademicInfoEditing(false);
      setAcademicInfoFeedback({
        tone: "success",
        message: payload?.message || "Personal information updated.",
      });
    } catch (error) {
      setAcademicInfoFeedback({
        tone: "error",
        message: error?.message || "Unable to update personal information.",
      });
    } finally {
      setIsAcademicInfoSubmitting(false);
    }
  };

  const startInlinePersonalInfoEdit = (fieldName) => {
    setActivePersonalInfoField(fieldName);
    setPersonalInfoInputValue(String(props.state?.[fieldName] || ""));
    setAcademicInfoFeedback({
      tone: "",
      message: "",
    });
  };

  const submitInlinePersonalInfoEdit = async () => {
    if (!props.state?.token || !activePersonalInfoField) {
      return;
    }

    const nextFieldValue = String(personalInfoInputValue || "").trim();
    const requiredFields = ["firstname", "lastname", "username"];

    if (
      requiredFields.includes(activePersonalInfoField) &&
      !String(nextFieldValue || "").trim()
    ) {
      setAcademicInfoFeedback({
        tone: "error",
        message: "First name, last name, and username are required.",
      });
      return;
    }

    const payloadBody = {
      firstname: String(props.state?.firstname || "").trim(),
      lastname: String(props.state?.lastname || "").trim(),
      username: String(props.state?.username || "").trim(),
      program: String(props.state?.program || "").trim(),
      university: String(props.state?.university || "").trim(),
      studyYear: String(props.state?.studyYear || "").trim(),
      term: String(props.state?.term || "").trim(),
      aiProvider: String(props.state?.aiProvider || "openai").trim(),
    };

    payloadBody[activePersonalInfoField] = nextFieldValue;

    if (
      !payloadBody.firstname ||
      !payloadBody.lastname ||
      !payloadBody.username
    ) {
      setAcademicInfoFeedback({
        tone: "error",
        message: "First name, last name, and username are required.",
      });
      return;
    }

    setIsPersonalInfoInlineSubmitting(true);
    setAcademicInfoFeedback({
      tone: "",
      message: "",
    });

    try {
      const response = await fetch(apiUrl("/api/user/profile"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadBody),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to update personal information.",
        );
      }

      const nextInfo = payload?.info || payloadBody;

      props.setUserAcademicInfo?.({
        firstname: nextInfo?.firstname || payloadBody.firstname,
        lastname: nextInfo?.lastname || payloadBody.lastname,
        username: nextInfo?.username || payloadBody.username,
        program: nextInfo?.program || payloadBody.program,
        university: nextInfo?.university || payloadBody.university,
        studyYear: nextInfo?.studyYear || payloadBody.studyYear,
        term: nextInfo?.term || payloadBody.term,
        aiProvider: nextInfo?.aiProvider || payloadBody.aiProvider,
      });
      setAcademicInfoFields({
        program: nextInfo?.program || payloadBody.program,
        university: nextInfo?.university || payloadBody.university,
        studyYear: nextInfo?.studyYear || payloadBody.studyYear,
        term: nextInfo?.term || payloadBody.term,
      });
      setActivePersonalInfoField("");
      setPersonalInfoInputValue("");
      setAcademicInfoFeedback({
        tone: "success",
        message: payload?.message || "Personal information updated.",
      });
    } catch (error) {
      setAcademicInfoFeedback({
        tone: "error",
        message: error?.message || "Unable to update personal information.",
      });
    } finally {
      setIsPersonalInfoInlineSubmitting(false);
    }
  };

  const handleInlinePersonalInfoKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitInlinePersonalInfoEdit();
      return;
    }

    if (event.key === "Escape") {
      setActivePersonalInfoField("");
      setPersonalInfoInputValue("");
    }
  };

  const renderInlineInfoField = (label, fieldName, fallback = "-") => {
    const isEditingThisField = activePersonalInfoField === fieldName;
    const displayValue = String(props.state?.[fieldName] || "").trim();

    return (
      <div className="fr Home_userMenu_contentDivs">
        <label>{label}:</label>
        {isEditingThisField ? (
          <input
            type="text"
            className="Home_userMenu_inlineInput"
            value={personalInfoInputValue}
            onChange={(event) => setPersonalInfoInputValue(event.target.value)}
            onKeyDown={handleInlinePersonalInfoKeyDown}
            autoFocus
            disabled={isPersonalInfoInlineSubmitting}
          />
        ) : (
          <p>{displayValue || fallback}</p>
        )}
        <button
          type="button"
          className="Home_userMenu_infoEditIcon"
          onClick={() => startInlinePersonalInfoEdit(fieldName)}
          aria-label={`Edit ${label.toLowerCase()}`}
          title={`Edit ${label.toLowerCase()}`}
          disabled={isPersonalInfoInlineSubmitting}
        >
          <i className="fas fa-pen"></i>
        </button>
      </div>
    );
  };

  return (
    <div style={homeBackgroundStyle}>
      <section id="Home_studysessions_article" className="fc">
        <section id="Home_preStart" className="fc slide-top">
          <div id="Home_preStart_leftPanel" className="fc">
            <div id="Home_topControls" className="fr">
              <div id="Home_navWrap">
                <Nav
                  path="/"
                  state={props.state}
                  logOut={props.logOut}
                  acceptFriend={props.acceptFriend}
                  makeNotificationsRead={props.makeNotificationsRead}
                  subApps={[
                    {
                      id: "study",
                      label: "Phenomed Student",
                      icon: "fas fa-stopwatch",
                      path: "/study",
                    },
                    {
                      id: "ecg",
                      label: "PhenoMed ECG",
                      icon: "fas fa-heartbeat",
                      path: "/ecg",
                    },
                    {
                      id: "school",
                      label: schoolPlannerLabel,
                      icon: "fas fa-layer-group",
                      path: schoolPlannerPath,
                    },
                    {
                      id: "social",
                      label: "Phenomed Social",
                      icon: "fas fa-house-user",
                      path: "/phenomedsocial",
                    },
                  ]}
                />
              </div>
            </div>
            <div id="Home_preStart_introWrap" className="fc">
              <div id="Home_preStart_intro" className="fr">
                <div id="Home_preStart_leftColumn" className="fc">
                  <div id="Home_preStart_leftColumnScroll" className="fc">
                    <p id="Home_preStart_eyebrow">PhenoMed Home Page</p>
                    <div id="Home_preStart_personalWrapper" className="fc">
                      <div id="Home_preStart_personalBio" className="fc">
                        <span id="Home_preStart_bio_name">
                          {props.state.firstname || "-"}{" "}
                          {props.state.lastname || "-"}
                        </span>
                        <span id="Home_preStart_bio_username">
                          ({props.state.username || "-"})
                        </span>
                        <span id="Home_preStart_bio_study">
                          Studying {props.state.program || "-"} at{" "}
                          {props.state.university || "-"} University
                        </span>
                        <div id="Home_preStart_bio_yearTermRow">
                          <span id="Home_preStart_bio_year">
                            Year {props.state.studyYear || "-"}
                          </span>
                          <span id="Home_preStart_bio_term">
                            Term {props.state.term || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div id="Home_preStart_rightColumn" className="fc">
                  <div
                    id="Home_preStart_profileWrapper"
                    ref={profilePictureWrapperRef}
                  >
                    {profilePictureSrc ? (
                      <img
                        id="Home_preStart_profilePic"
                        src={profilePictureSrc}
                        alt={`${props.state.firstname} ${props.state.lastname}`}
                        onDoubleClick={resetProfilePictureViewport}
                        onTouchStart={handleProfilePictureTouchStart}
                        onTouchMove={handleProfilePictureTouchMove}
                        onTouchEnd={handleProfilePictureTouchEnd}
                        onTouchCancel={handleProfilePictureTouchEnd}
                        onPointerDown={handleProfilePicturePointerDown}
                        onPointerMove={handleProfilePicturePointerMove}
                        onPointerUp={handleProfilePicturePointerUp}
                        onPointerCancel={handleProfilePicturePointerUp}
                        onWheel={handleProfilePictureWheel}
                        className={isProfilePictureDragging ? "isDragging" : ""}
                        style={{
                          transform: `translate(${profilePictureViewport.offsetX}px, ${profilePictureViewport.offsetY}px) scale(${profilePictureViewport.scale})`,
                        }}
                      />
                    ) : (
                      <i className="fas fa-user" aria-hidden="true"></i>
                    )}
                    <input
                      ref={galleryUploadInputRef}
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: "none" }}
                      onChange={handleProfilePictureSelected}
                    />
                  </div>
                </div>
              </div>
              <div className="Home_mediaFriendsRow">
                <div className="fc Home_preStart_toolCard Home_preStart_toolCard--flush">
                  <div className="Home_reportHeader fr">
                    <h3>Media Gallery</h3>
                  </div>
                  <div className="fc Home_galleryCard">
                    <div className="Home_galleryTopRow fr">
                      <p className="Home_galleryMetaText">
                        Upload images or videos, preview them, or delete them
                        from storage.
                      </p>
                      <button
                        type="button"
                        className="Home_changePasswordSubmit"
                        onClick={openProfilePicturePicker}
                        disabled={isImageGalleryUploading}
                        style={{ marginRight: "1em" }}
                      >
                        {isImageGalleryUploading
                          ? "Uploading..."
                          : "Upload media"}
                      </button>
                      <button
                        type="button"
                        className="Home_changePasswordSubmit"
                        onClick={handleClearPendingUploads}
                        style={{
                          marginRight: "0.5em",
                          background: "#ffe",
                          color: "#333",
                          border: "1px solid #ccc",
                        }}
                      >
                        Clear All Pending Uploads
                      </button>
                      <span
                        style={{
                          alignSelf: "center",
                          color: "#b77",
                          fontSize: "0.95em",
                        }}
                      >
                        {clearPendingFeedback}
                      </span>
                    </div>
                    {imageGallery.length ? (
                      <div className="Home_galleryGrid">
                        {imageGallery.map((image) => {
                          const imagePublicId = String(image?.publicId || "");
                          const isVideoItem = isVideoGalleryItem(image);
                          const isActionsOpen =
                            imagePublicId === activeGalleryActionsPublicId;
                          const isCurrentProfilePicture =
                            String(image?.url || "").trim() ===
                            profilePictureSrc;
                          return (
                            <article
                              key={image.publicId}
                              className="Home_galleryItem fc"
                            >
                              <div className="Home_galleryThumbWrap">
                                <button
                                  type="button"
                                  className="Home_galleryThumbButton"
                                  onClick={() =>
                                    toggleGalleryItemActions(image.publicId)
                                  }
                                  title="Show media actions"
                                >
                                  {isVideoItem ? (
                                    <video
                                      src={image.url}
                                      className="Home_galleryThumb"
                                      muted
                                      playsInline
                                      preload="metadata"
                                    />
                                  ) : (
                                    <img
                                      src={image.url}
                                      alt="Gallery upload"
                                      className="Home_galleryThumb"
                                    />
                                  )}
                                </button>
                                <div
                                  className={`Home_galleryItemActions fc${isActionsOpen ? " Home_galleryItemActions--open" : ""}`}
                                >
                                  <button
                                    type="button"
                                    className="Home_editPicButton"
                                    onClick={() => {
                                      if (isVideoItem) {
                                        if (typeof window !== "undefined") {
                                          window.open(
                                            image.url,
                                            "_blank",
                                            "noopener,noreferrer",
                                          );
                                        }
                                        return;
                                      }

                                      openGalleryViewer(image.publicId);
                                    }}
                                  >
                                    <i className="fas fa-expand"></i>
                                    <span>{isVideoItem ? "Open" : "View"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="Home_editPicButton"
                                    onClick={() =>
                                      handleSetGalleryImageAsProfilePicture(
                                        image.publicId,
                                      )
                                    }
                                    disabled={
                                      isVideoItem ||
                                      isCurrentProfilePicture ||
                                      isImageGallerySettingProfilePublicId ===
                                        image.publicId
                                    }
                                  >
                                    <i className="fas fa-user-check"></i>
                                    <span>
                                      {isImageGallerySettingProfilePublicId ===
                                      image.publicId
                                        ? "Saving..."
                                        : isVideoItem
                                          ? "Image only"
                                          : isCurrentProfilePicture
                                            ? "Current pp"
                                            : "Set as pp"}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className="Home_editPicButton"
                                    onClick={() =>
                                      handleDeleteGalleryImage(image.publicId)
                                    }
                                    disabled={
                                      isImageGalleryDeletingPublicId ===
                                      image.publicId
                                    }
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>
                                      {isImageGalleryDeletingPublicId ===
                                      image.publicId
                                        ? "Deleting..."
                                        : "Delete"}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="Home_galleryEmptyState">
                        No media uploaded yet.
                      </div>
                    )}
                  </div>
                </div>
                <div className="fc Home_preStart_toolCard Home_preStart_toolCard--flush Home_socialFriendsPanel">
                  <div className="Home_reportHeader fr">
                    <h3>Social Friends</h3>
                    <div className="Home_reportHeaderActions fr">
                      <span className="Home_socialFriendsCount">
                        {socialFriends.length}{" "}
                        {socialFriends.length === 1 ? "friend" : "friends"}
                      </span>
                      <button
                        type="button"
                        className="Home_socialFriendsOpenButton"
                        onClick={() => history.push("/phenomedsocial")}
                      >
                        <i
                          className="fas fa-user-friends"
                          aria-hidden="true"
                        ></i>
                        <span>Open Social</span>
                      </button>
                    </div>
                  </div>
                  <div className="fc Home_socialFriendsCard">
                    <p className="Home_galleryMetaText Home_socialFriendsMeta">
                      Synced from Phenomed Social. Visit the social workspace to
                      search, chat, and manage doctor connections.
                    </p>
                    {socialFriends.length ? (
                      <ul className="Home_socialFriendsList">
                        {socialFriends
                          .map((friend) => [
                            <li
                              key={friend.id}
                              className="Home_socialFriendItem fr"
                            >
                              <div className="Home_socialFriendIdentity fr">
                                <span
                                  className="Home_socialFriendAvatar"
                                  aria-hidden="true"
                                >
                                  {friend.avatarUrl ? (
                                    <img
                                      src={friend.avatarUrl}
                                      alt=""
                                      className="Home_socialFriendAvatarImage"
                                    />
                                  ) : (
                                    friend.initials
                                  )}
                                </span>
                                <div className="fc Home_socialFriendCopy">
                                  {friend.username ? (
                                    <Link
                                      className="Home_socialFriendName"
                                      to={`/profile/${friend.username}`}
                                    >
                                      {friend.displayName}
                                    </Link>
                                  ) : (
                                    <span className="Home_socialFriendName">
                                      {friend.displayName}
                                    </span>
                                  )}
                                  <span className="Home_socialFriendUsername">
                                    {friend.username
                                      ? `@${friend.username}`
                                      : "Phenomed doctor"}
                                  </span>
                                </div>
                              </div>
                              <div className="fc Home_socialFriendPresence">
                                <span className="Home_socialFriendStatus">
                                  <i
                                    className="fas fa-circle"
                                    aria-hidden="true"
                                    style={{
                                      color: getFriendStatusColor(
                                        friend.isConnected,
                                      ),
                                    }}
                                  ></i>
                                  <span>
                                    {friend.isConnected ? "Online" : "Offline"}
                                  </span>
                                </span>
                                <button
                                  className="Home_socialFriendChatIcon"
                                  title="Open chat"
                                  onClick={() => setOpenChatFriendId(friend.id)}
                                  style={{
                                    marginLeft: 8,
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  <i
                                    className="fas fa-comments"
                                    aria-hidden="true"
                                  ></i>
                                </button>
                              </div>
                            </li>,
                            friend.username === "naghamtrkmani" &&
                              openChatFriendId === friend.id && (
                                <li
                                  key={friend.id + "-naghamchat"}
                                  className="Home_socialFriendNaghamChat fc"
                                >
                                  <section id="Chat_article" className="fc">
                                    <FriendChat
                                      state={{
                                        activeChatFriendName:
                                          friend.displayName || friend.username,
                                        activeChatFriendId: friend.id,
                                        isChatting: true,
                                      }}
                                      content={{}}
                                      sendToThemMessage={() => {}}
                                      updateMyTypingPresence={() => {}}
                                      closeActiveChat={() =>
                                        setOpenChatFriendId(null)
                                      }
                                    />
                                  </section>
                                </li>
                              ),
                          ])
                          .flat()}
                      </ul>
                    ) : (
                      <div className="Home_galleryEmptyState Home_socialFriendsEmptyState">
                        No friends synced from Phenomed Social yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Home_preStart_leftPanel */}
          <div id="Home_preStart_reports" className="fc Home_preStart_reports">
            <div
              id="Home_preStart_reportsToggle"
              className="fc"
              role="button"
              tabIndex={0}
              aria-label={
                isReportsWrapperOpen
                  ? "Hide reports and settings panel"
                  : "Show reports and settings panel"
              }
              aria-pressed={isReportsWrapperOpen}
              onClick={() =>
                setIsReportsWrapperOpen((currentValue) => !currentValue)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setIsReportsWrapperOpen((currentValue) => !currentValue);
                }
              }}
              title={
                isReportsWrapperOpen
                  ? "Hide reports and settings"
                  : "Open reports and settings"
              }
            >
              <i className="fas fa-cog" aria-hidden="true"></i>
            </div>

            <div
              id="Home_preStart_reportsWrapper"
              className={`fc${isReportsWrapperOpen ? "" : " Home_preStart_reportsWrapper--closed"}`}
            >
              <div className="fc Home_preStart_reportCard Home_preStart_reportsCard">
                <div className="Home_reportHeader fr">
                  <h3>Log Record: Date and Time</h3>
                  <div className="Home_reportHeaderActions fr">
                    <button
                      type="button"
                      className="Home_reportDeleteButton"
                      onClick={clearLoginLog}
                      disabled={isLoginLogDeleting}
                      aria-label="Delete all login log entries"
                      title="Delete all login log entries"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                    <button
                      type="button"
                      className="Home_reportToggleButton"
                      onClick={() => toggleReportSection("loginLog")}
                      aria-label="Toggle login log"
                      aria-expanded={isReportSectionOpen("loginLog")}
                      title="Toggle login log"
                    >
                      <i
                        className={`fas ${isReportSectionOpen("loginLog") ? "fa-chevron-up" : "fa-chevron-down"}`}
                      ></i>
                    </button>
                  </div>
                </div>
                <div
                  className={`Home_reportBody fc${isReportSectionOpen("loginLog") ? " isOpen" : ""}`}
                >
                  <ul className="fc Home_studySessions_area">
                    {loginLogError ? (
                      <div>{loginLogError}</div>
                    ) : activeLoginRecord === null ? (
                      <div>No login records to show yet</div>
                    ) : (
                      (() => {
                        const loggedInAt = new Date(
                          activeLoginRecord.loggedInAt,
                        );
                        const loggedOutAt = activeLoginRecord.loggedOutAt
                          ? new Date(activeLoginRecord.loggedOutAt)
                          : null;

                        return (
                          <li
                            key={
                              activeLoginRecord._id ||
                              activeLoginRecord.loggedInAt ||
                              loginLogIndex
                            }
                            className="Home_logRecordViewer"
                          >
                            <button
                              type="button"
                              className="Home_logRecordArrow"
                              onClick={() =>
                                setLoginLogIndex((currentIndex) =>
                                  Math.max(currentIndex - 1, 0),
                                )
                              }
                              disabled={loginLogIndex === 0}
                              aria-label="Show newer login record"
                              title="Show newer login record"
                            >
                              <i className="fas fa-angle-up"></i>
                            </button>
                            <div className="Home_logRecordCard">
                              <div className="Home_logRecordEntry fc">
                                <span className="Home_logRecordLabel">
                                  Login:
                                </span>
                                <span className="Home_logRecordValue">
                                  {loggedInAt.toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}{" "}
                                  {loggedInAt.toLocaleTimeString(undefined, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="Home_logRecordEntry fc">
                                <span className="Home_logRecordLabel">
                                  Logout:
                                </span>
                                <span className="Home_logRecordValue">
                                  {loggedOutAt
                                    ? `${loggedOutAt.toLocaleDateString(
                                        undefined,
                                        {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                        },
                                      )} ${loggedOutAt.toLocaleTimeString(
                                        undefined,
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          second: "2-digit",
                                        },
                                      )}`
                                    : "Still active"}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="Home_logRecordArrow"
                              onClick={() =>
                                setLoginLogIndex((currentIndex) =>
                                  Math.min(
                                    currentIndex + 1,
                                    loginRecords.length - 1,
                                  ),
                                )
                              }
                              disabled={
                                loginLogIndex === loginRecords.length - 1
                              }
                              aria-label="Show older login record"
                              title="Show older login record"
                            >
                              <i className="fas fa-angle-down"></i>
                            </button>
                          </li>
                        );
                      })()
                    )}
                  </ul>
                </div>
              </div>

              {isVisitLogOwner ? (
                <div className="fc Home_preStart_reportCard Home_preStart_reportsCard">
                  <div className="Home_reportHeader fr">
                    <h3>Visit Log: App Entries</h3>
                    <div className="Home_reportHeaderActions fr">
                      <button
                        type="button"
                        className="Home_reportDeleteButton"
                        onClick={clearVisitLog}
                        disabled={isVisitLogDeleting}
                        aria-label="Delete all visit log entries"
                        title="Delete all visit log entries"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                      <button
                        type="button"
                        className="Home_reportToggleButton"
                        onClick={() => toggleReportSection("visitLog")}
                        aria-label="Toggle visit log"
                        aria-expanded={isReportSectionOpen("visitLog")}
                        title="Toggle visit log"
                      >
                        <i
                          className={`fas ${isReportSectionOpen("visitLog") ? "fa-chevron-up" : "fa-chevron-down"}`}
                        ></i>
                      </button>
                    </div>
                  </div>
                  <div
                    className={`Home_reportBody fc${isReportSectionOpen("visitLog") ? " isOpen" : ""}`}
                  >
                    <ul className="fc Home_studySessions_area">
                      {isVisitLogLoading ? (
                        <div>Loading visit log...</div>
                      ) : visitLogError ? (
                        <div>{visitLogError}</div>
                      ) : activeVisitLogRecord === null ? (
                        <div>No visit records to show yet</div>
                      ) : (
                        (() => {
                          const visitedAt = new Date(
                            activeVisitLogRecord.visitedAt,
                          );

                          return (
                            <li
                              key={`${activeVisitLogRecord._id || activeVisitLogRecord.ip || "visit"}-${activeVisitLogRecord.visitedAt || visitLogIndex}`}
                              className="Home_logRecordViewer"
                            >
                              <button
                                type="button"
                                className="Home_logRecordArrow"
                                onClick={() =>
                                  setVisitLogIndex((currentIndex) =>
                                    Math.max(currentIndex - 1, 0),
                                  )
                                }
                                disabled={visitLogIndex === 0}
                                aria-label="Show newer visit record"
                                title="Show newer visit record"
                              >
                                <i className="fas fa-angle-up"></i>
                              </button>
                              <div className="Home_logRecordCard Home_logRecordCard--stacked">
                                <div className="Home_logRecordEntry fc">
                                  <span className="Home_logRecordLabel">
                                    IP:
                                  </span>
                                  <span className="Home_logRecordValue">
                                    {`${activeVisitLogRecord.ip || "Unknown IP"} (${activeVisitLogRecord.country || "Unknown"})`}
                                  </span>
                                </div>
                                <div className="Home_logRecordEntry fc">
                                  <span className="Home_logRecordLabel">
                                    Visited:
                                  </span>
                                  <span className="Home_logRecordValue">
                                    {visitedAt.toLocaleDateString(undefined, {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}{" "}
                                    {visitedAt.toLocaleTimeString(undefined, {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="Home_logRecordArrow"
                                onClick={() =>
                                  setVisitLogIndex((currentIndex) =>
                                    Math.min(
                                      currentIndex + 1,
                                      visitLogEntries.length - 1,
                                    ),
                                  )
                                }
                                disabled={
                                  visitLogIndex === visitLogEntries.length - 1
                                }
                                aria-label="Show older visit record"
                                title="Show older visit record"
                              >
                                <i className="fas fa-angle-down"></i>
                              </button>
                            </li>
                          );
                        })()
                      )}
                    </ul>
                  </div>
                </div>
              ) : null}

              {isVisitLogOwner ? (
                <div className="fc Home_preStart_reportsCard">
                  <div className="Home_reportHeader fr">
                    <h3>naghamtrkmani course letter</h3>
                    <button
                      type="button"
                      className="Home_reportToggleButton"
                      onClick={() => toggleReportSection("naghamLetter")}
                      aria-label="Toggle Nagham course letter"
                      aria-expanded={isReportSectionOpen("naghamLetter")}
                      title="Toggle Nagham course letter"
                    >
                      <i
                        className={`fas ${isReportSectionOpen("naghamLetter") ? "fa-chevron-up" : "fa-chevron-down"}`}
                      ></i>
                    </button>
                  </div>
                  <div
                    className={`Home_reportBody fc${isReportSectionOpen("naghamLetter") ? " isOpen" : ""}`}
                  >
                    <div id="Home_naghamCourseLetter_div" className="fc">
                      <select
                        id="Home_naghamCourseLetter_select"
                        value={selectedNaghamCourseId}
                        onChange={(event) => {
                          const nextCourseId = event.target.value;
                          setSelectedNaghamCourseId(nextCourseId);
                          setNaghamCourseLetterInput(
                            naghamCourseLetters[nextCourseId] ||
                              DEFAULT_NAGHAM_COURSE_LETTER,
                          );
                          if (naghamCourseLetterFeedback) {
                            setNaghamCourseLetterFeedback("");
                          }
                        }}
                      >
                        {naghamCourseOptions.length === 0 ? (
                          <option value="">No Nagham courses found</option>
                        ) : null}
                        {naghamCourseOptions.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.name}
                          </option>
                        ))}
                      </select>
                      <textarea
                        id="Home_naghamCourseLetter_textarea"
                        value={naghamCourseLetterInput}
                        onChange={(event) => {
                          setNaghamCourseLetterInput(event.target.value);
                          if (naghamCourseLetterFeedback) {
                            setNaghamCourseLetterFeedback("");
                          }
                        }}
                        placeholder="Write the printed letter for the selected Nagham course"
                        rows={5}
                      />
                      <button
                        type="button"
                        className="Home_changePasswordSubmit"
                        onClick={saveNaghamCourseLetter}
                      >
                        Save note
                      </button>
                      {naghamCourseLetterFeedback ? (
                        <p className="Home_passwordFeedback Home_passwordFeedback--success">
                          {naghamCourseLetterFeedback}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="fc Home_preStart_reportsCard">
                <div className="Home_reportHeader fr">
                  <h3>planner music playlist</h3>
                  <button
                    type="button"
                    className="Home_reportToggleButton"
                    onClick={() => toggleReportSection("musicPlaylist")}
                    aria-label="Toggle planner music playlist"
                    aria-expanded={isReportSectionOpen("musicPlaylist")}
                    title="Toggle planner music playlist"
                  >
                    <i
                      className={`fas ${isReportSectionOpen("musicPlaylist") ? "fa-chevron-up" : "fa-chevron-down"}`}
                    ></i>
                  </button>
                </div>
                <div
                  className={`Home_reportBody fc${isReportSectionOpen("musicPlaylist") ? " isOpen" : ""}`}
                >
                  <div id="Home_musicArchivePlaylist_div" className="fc">
                    <div id="Home_musicArchiveSearch_div" className="fc">
                      <div className="Home_musicArchiveSearch_row fr">
                        <input
                          id="Home_musicArchiveSearch_input"
                          type="search"
                          value={musicArchiveSearchQuery}
                          onChange={(event) => {
                            setMusicArchiveSearchQuery(event.target.value);
                            if (musicArchiveSearchFeedback) {
                              setMusicArchiveSearchFeedback("");
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              searchMusicArchiveSongs();
                            }
                          }}
                          placeholder="Search songs from Internet Archive"
                        />
                        <button
                          type="button"
                          className="Home_changePasswordSubmit"
                          onClick={searchMusicArchiveSongs}
                          disabled={isMusicArchiveSearching}
                        >
                          {isMusicArchiveSearching ? "Searching..." : "Search"}
                        </button>
                      </div>
                      {musicArchiveSearchFeedback ? (
                        <p className="Home_passwordFeedback Home_passwordFeedback--success">
                          {musicArchiveSearchFeedback}
                        </p>
                      ) : null}
                      {musicArchiveSearchResults.length > 0 ? (
                        <div
                          id="Home_musicArchiveSearch_results"
                          className="fc"
                        >
                          {musicArchiveSearchResults.map((result) => (
                            <button
                              key={result.identifier}
                              type="button"
                              className="Home_musicArchiveSearch_result"
                              onClick={() =>
                                addMusicArchiveSong(result.identifier)
                              }
                              title={result.identifier}
                            >
                              <strong>{result.title}</strong>
                              <span>{result.creator}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <textarea
                      id="Home_musicArchivePlaylist_textarea"
                      value={musicArchivePlaylistInput}
                      onChange={(event) => {
                        setMusicArchivePlaylistInput(event.target.value);
                        if (musicArchivePlaylistFeedback) {
                          setMusicArchivePlaylistFeedback("");
                        }
                      }}
                      placeholder="One Internet Archive identifier or song name per line"
                    />
                    <button
                      type="button"
                      className="Home_changePasswordSubmit"
                      onClick={saveMusicArchivePlaylist}
                    >
                      Save playlist
                    </button>
                    {musicArchivePlaylistFeedback ? (
                      <p className="Home_passwordFeedback Home_passwordFeedback--success">
                        {musicArchivePlaylistFeedback}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="fc Home_preStart_reportsCard">
                <div className="Home_reportHeader fr">
                  <h3>schoolplanner telegram</h3>
                  <button
                    type="button"
                    className="Home_reportToggleButton"
                    onClick={() => toggleReportSection("telegram")}
                    aria-label="Toggle schoolplanner telegram"
                    aria-expanded={isReportSectionOpen("telegram")}
                    title="Toggle schoolplanner telegram"
                  >
                    <i
                      className={`fas ${isReportSectionOpen("telegram") ? "fa-chevron-up" : "fa-chevron-down"}`}
                    ></i>
                  </button>
                </div>
                <div
                  className={`Home_reportBody fc${isReportSectionOpen("telegram") ? " isOpen" : ""}`}
                >
                  <div id="Home_schoolPlannerTelegram_div" className="fc">
                    {schoolPlannerTelegramFeedback ? (
                      <p className="Home_passwordFeedback Home_passwordFeedback--success">
                        {schoolPlannerTelegramFeedback}
                      </p>
                    ) : null}
                    <div
                      id="Home_schoolPlannerTelegram_adminDiv"
                      className="fc"
                    >
                      <label className="Home_userMenu_title_label">
                        telegram mtproto config
                      </label>
                      <p className="Home_schoolPlannerTelegram_adminStatus">
                        {telegramConfigStatus.configured
                          ? "Your Telegram connection is saved for this account."
                          : "Your Telegram connection is not complete yet."}
                      </p>
                      <div className="Home_schoolPlannerTelegram_adminFlags fr">
                        <span>
                          API ID:{" "}
                          {telegramConfigStatus.hasApiId ? "set" : "missing"}
                        </span>
                        <span>
                          API Hash:{" "}
                          {telegramConfigStatus.hasApiHash ? "set" : "missing"}
                        </span>
                        <span>
                          Session:{" "}
                          {telegramConfigStatus.hasStringSession
                            ? "set"
                            : "missing"}
                        </span>
                      </div>
                      <input
                        id="Home_schoolPlannerTelegram_apiId_input"
                        type="text"
                        value={telegramApiIdInput}
                        onChange={(event) => {
                          setTelegramApiIdInput(event.target.value);
                          if (telegramConfigFeedback) {
                            setTelegramConfigFeedback("");
                          }
                        }}
                        placeholder="TELEGRAM_API_ID"
                      />
                      <input
                        id="Home_schoolPlannerTelegram_apiHash_input"
                        type="text"
                        value={telegramApiHashInput}
                        onChange={(event) => {
                          setTelegramApiHashInput(event.target.value);
                          if (telegramConfigFeedback) {
                            setTelegramConfigFeedback("");
                          }
                        }}
                        placeholder="TELEGRAM_API_HASH"
                      />
                      <input
                        id="Home_schoolPlannerTelegram_phone_input"
                        type="text"
                        value={telegramPhoneNumberInput}
                        onChange={(event) => {
                          setTelegramPhoneNumberInput(event.target.value);
                          if (telegramConfigFeedback) {
                            setTelegramConfigFeedback("");
                          }
                        }}
                        placeholder="Telegram phone number with country code"
                      />
                      <button
                        type="button"
                        className="Home_changePasswordSubmit"
                        onClick={startTelegramAuth}
                      >
                        Send Telegram code
                      </button>
                      {telegramAuthStage === "code" ||
                      telegramAuthStage === "password" ||
                      telegramAuthStage === "connected" ? (
                        <>
                          {/* Button to clear all pending uploads for troubleshooting */}
                          <div
                            style={{
                              margin: "1em 0",
                              padding: "0.5em",
                              background: "#ffe",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                            }}
                          >
                            <button
                              onClick={handleClearPendingUploads}
                              style={{ marginRight: "1em" }}
                            >
                              Clear All Pending Uploads
                            </button>
                            <span>{clearPendingFeedback}</span>
                          </div>
                          <input
                            id="Home_schoolPlannerTelegram_code_input"
                            type="text"
                            value={telegramPhoneCodeInput}
                            onChange={(event) => {
                              setTelegramPhoneCodeInput(event.target.value);
                              if (telegramConfigFeedback) {
                                setTelegramConfigFeedback("");
                              }
                            }}
                            placeholder="Telegram login code"
                          />
                          <button
                            type="button"
                            className="Home_changePasswordSubmit"
                            onClick={verifyTelegramCode}
                          >
                            Verify code
                          </button>
                        </>
                      ) : null}
                      {telegramAuthStage === "password" ? (
                        <>
                          <input
                            id="Home_schoolPlannerTelegram_password_input"
                            type="password"
                            value={telegramPasswordInput}
                            onChange={(event) => {
                              setTelegramPasswordInput(event.target.value);
                              if (telegramConfigFeedback) {
                                setTelegramConfigFeedback("");
                              }
                            }}
                            placeholder="Telegram 2-step password if needed"
                          />
                          <button
                            type="button"
                            className="Home_changePasswordSubmit"
                            onClick={verifyTelegramPassword}
                          >
                            Verify password
                          </button>
                        </>
                      ) : null}
                      <p className="Home_schoolPlannerTelegram_adminStatus">
                        {telegramAuthStage === "password"
                          ? "Telegram is asking for the 2-step verification password."
                          : telegramAuthStage === "connected"
                            ? "Telegram login is connected for this account."
                            : "Start with API ID, API Hash, and phone number."}
                      </p>
                      {telegramConfigFeedback ? (
                        <p className="Home_passwordFeedback Home_passwordFeedback--success">
                          {telegramConfigFeedback}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="fc Home_preStart_reportsCard">
                <div className="Home_reportHeader fr">
                  <h3>Graphic Control</h3>
                  <button
                    type="button"
                    className="Home_reportToggleButton"
                    onClick={() => toggleReportSection("graphicControl")}
                    aria-label="Toggle graphic control"
                    aria-expanded={isReportSectionOpen("graphicControl")}
                    title="Toggle graphic control"
                  >
                    <i
                      className={`fas ${isReportSectionOpen("graphicControl") ? "fa-chevron-up" : "fa-chevron-down"}`}
                    ></i>
                  </button>
                </div>
                <div
                  className={`Home_reportBody fc${isReportSectionOpen("graphicControl") ? " isOpen" : ""}`}
                >
                  <div className="fc Home_graphicControlCard">
                    <label className="Home_preStart_toggleRow">
                      <input
                        type="checkbox"
                        checked={schoolPlannerReducedMotion}
                        onChange={(event) =>
                          setSchoolPlannerReducedMotion(event.target.checked)
                        }
                      />
                      <span>Reduce School Planner motion</span>
                    </label>
                    <label className="fc Home_graphicControlField">
                      <span>
                        PhenoMed Social chat background (Chat_messages)
                      </span>
                      <input
                        type="text"
                        value={phenomedSocialChatBackground}
                        onChange={(event) =>
                          setPhenomedSocialChatBackground(event.target.value)
                        }
                        placeholder="Image URL for chat panel background"
                      />
                    </label>
                    <button
                      type="button"
                      className="Home_changePasswordToggle"
                      onClick={() => setPhenomedSocialChatBackground("")}
                    >
                      Clear chat background
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="fc Home_preStart_reportsCard"
                id="Home_userMenu_panelCard"
              >
                <div className="Home_reportHeader fr">
                  <h3>Control Panel</h3>
                  <button
                    type="button"
                    className="Home_reportToggleButton"
                    onClick={() => toggleReportSection("controlPanel")}
                    aria-label="Toggle control panel"
                    aria-expanded={isReportSectionOpen("controlPanel")}
                    aria-controls="Home_userMenu_personalInfo_content_div"
                    title="Toggle control panel"
                  >
                    <i
                      className={`fas ${isReportSectionOpen("controlPanel") ? "fa-chevron-up" : "fa-chevron-down"}`}
                    ></i>
                  </button>
                </div>

                <div
                  id="Home_userMenu_personalInfo_content_div"
                  className={`fc Home_userMenu_panelBody${isReportSectionOpen("controlPanel") ? " isOpen" : ""}`}
                >
                  {renderInlineInfoField("First name", "firstname")}
                  {renderInlineInfoField("Last name", "lastname")}
                  {renderInlineInfoField("Username", "username")}
                  {renderInlineInfoField("Program", "program")}
                  {renderInlineInfoField("University", "university")}
                  {renderInlineInfoField("Year", "studyYear")}
                  {renderInlineInfoField("Term", "term")}
                  <div className="fr Home_userMenu_contentDivs">
                    <label>Password:</label>
                    <button
                      type="button"
                      className="Home_changePasswordToggle"
                      onClick={() =>
                        setIsPasswordFormOpen((current) => !current)
                      }
                    >
                      {isPasswordFormOpen ? "Close" : "Change password"}
                    </button>
                  </div>
                  <div className="fr Home_userMenu_contentDivs">
                    <label>Footer:</label>
                    <button
                      type="button"
                      className="Home_changePasswordToggle"
                      onClick={() =>
                        props.setAppFooterHidden?.(
                          !props.state?.hide_app_footer,
                        )
                      }
                    >
                      {props.state?.hide_app_footer
                        ? "Show footer"
                        : "Hide footer"}
                    </button>
                  </div>

                  {academicInfoFeedback.message ? (
                    <p
                      className={`Home_passwordFeedback Home_passwordFeedback--${academicInfoFeedback.tone || "info"}`}
                    >
                      {academicInfoFeedback.message}
                    </p>
                  ) : null}
                  {isAcademicInfoEditing ? (
                    <form
                      id="Home_editAcademicInfo_form"
                      className="fc"
                      onSubmit={handleAcademicInfoSave}
                    >
                      <input
                        type="text"
                        name="program"
                        placeholder="Program"
                        value={academicInfoFields.program}
                        onChange={updateAcademicInfoField}
                      />
                      <input
                        type="text"
                        name="university"
                        placeholder="University"
                        value={academicInfoFields.university}
                        onChange={updateAcademicInfoField}
                      />
                      <input
                        type="text"
                        name="studyYear"
                        placeholder="Year"
                        value={academicInfoFields.studyYear}
                        onChange={updateAcademicInfoField}
                      />
                      <input
                        type="text"
                        name="term"
                        placeholder="Term"
                        value={academicInfoFields.term}
                        onChange={updateAcademicInfoField}
                      />
                      <button
                        type="submit"
                        className="Home_changePasswordSubmit"
                        disabled={isAcademicInfoSubmitting}
                      >
                        {isAcademicInfoSubmitting ? "Saving..." : "Save"}
                      </button>
                    </form>
                  ) : null}
                  {passwordFeedback.message ? (
                    <p
                      className={`Home_passwordFeedback Home_passwordFeedback--${passwordFeedback.tone || "info"}`}
                    >
                      {passwordFeedback.message}
                    </p>
                  ) : null}
                  {isPasswordFormOpen ? (
                    <form
                      id="Home_changePassword_form"
                      className="fc"
                      onSubmit={handlePasswordChange}
                    >
                      <input
                        type="password"
                        name="currentPassword"
                        placeholder="Current password"
                        value={passwordFields.currentPassword}
                        onChange={updatePasswordField}
                        autoComplete="current-password"
                      />
                      <input
                        type="password"
                        name="newPassword"
                        placeholder="New password"
                        value={passwordFields.newPassword}
                        onChange={updatePasswordField}
                        autoComplete="new-password"
                      />
                      <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm new password"
                        value={passwordFields.confirmPassword}
                        onChange={updatePasswordField}
                        autoComplete="new-password"
                      />
                      <button
                        type="submit"
                        className="Home_changePasswordSubmit"
                        disabled={isPasswordSubmitting}
                      >
                        {isPasswordSubmitting ? "Saving..." : "Save password"}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
        <ImageViewerModal
          isOpen={isImageViewerOpen}
          images={imageOnlyGallery}
          activeIndex={activeGalleryImageIndex}
          onChangeIndex={setActiveGalleryImageIndex}
          onClose={() => setIsImageViewerOpen(false)}
          title={
            activeGalleryImage
              ? String(activeGalleryImage.publicId || "Image viewer")
              : "Image viewer"
          }
        />
      </section>
    </div>
  );
}
export default Home;
