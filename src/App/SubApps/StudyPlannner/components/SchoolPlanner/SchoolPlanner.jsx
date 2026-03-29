//..............IMPORT................
import React, { Component } from "react";
import "./schoolPlanner.css";
import { apiUrl } from "../../../../../config/api";
//.........VARIABLES................
var courses = [];
var lectures = [];
var courses_partOfPlan = [];
var checkedLectures = [];
var checkedCourses = [];
var courseDayAndTime = [];
var courseExams = [];
var lectureOutlines = [];
var courseNames = [];
var courseNames_filtered = [];
var courseInstructorsNames = [];
var courseInstructorsNames_filtered = [];
var target_editCourse;
var selectedLecture;
var course_pages = [];
var lectureInEdit = {};

var timezone = new Date().getTimezoneOffset();
var todayDate = Date.now() - timezone * 60000;

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getProgressStats = (progressValue, lengthValue) => {
  const progress = Math.max(0, toSafeNumber(progressValue));
  const length = Math.max(0, toSafeNumber(lengthValue));
  const remaining = Math.max(0, length - progress);
  const percent = length > 0 ? Math.round((progress * 100) / length) : 0;

  return {
    progress,
    length,
    remaining,
    percent,
    indicatorWidth: (150 * percent) / 100,
  };
};

const getSafePagesPerDay = (lengthValue, progressValue, daysValue) => {
  const length = toSafeNumber(lengthValue);
  const progress = toSafeNumber(progressValue);
  const days = Math.max(0, toSafeNumber(daysValue));

  if (days <= 0) {
    return 0;
  }

  return Math.max(0, Math.ceil((length - progress) / days));
};

const getPrimaryCourseExam = (examEntries = []) => {
  const firstExam = examEntries[0] || {};

  return {
    exam_type: firstExam.exam_type || "-",
    exam_date: firstExam.exam_date || "-",
    exam_time: firstExam.exam_time || "-",
    course_grade: firstExam.course_grade || "",
    course_fullGrade: firstExam.course_fullGrade || "",
  };
};

const formatExamDateParts = (value) => {
  if (!value || value === "-") {
    return { day: "", month: "", year: "" };
  }

  const dateParts = String(value).split("-");
  if (dateParts.length === 3) {
    return {
      year: dateParts[0] || "",
      month: dateParts[1] || "",
      day: dateParts[2] || "",
    };
  }

  return { day: "", month: "", year: "" };
};

const buildExamDateValue = ({ day, month, year }) => {
  const normalizedDay = String(day || "").trim();
  const normalizedMonth = String(month || "").trim();
  const normalizedYear = String(year || "").trim();

  if (!normalizedDay || !normalizedMonth || !normalizedYear) {
    return "";
  }

  return `${normalizedYear.padStart(4, "0")}-${normalizedMonth.padStart(2, "0")}-${normalizedDay.padStart(2, "0")}`;
};

const formatExamTimeParts = (value) => {
  if (!value || value === "-") {
    return { hour: "", minute: "" };
  }

  const timeParts = String(value).split(":");
  return {
    hour: timeParts[0] || "",
    minute: timeParts[1] || "",
  };
};

const buildExamTimeValue = ({ hour, minute }) => {
  const normalizedHour = String(hour || "").trim();
  const normalizedMinute = String(minute || "").trim();

  if (!normalizedHour || !normalizedMinute) {
    return "";
  }

  return `${normalizedHour.padStart(2, "0")}:${normalizedMinute.padStart(2, "0")}`;
};

const getCourseDueText = (course) => {
  const examDateinMillisec = new Date(course.exam_date);
  const diffDaysWithDecimals = (examDateinMillisec - todayDate) / 86400000;
  const diffDaysWithoutDecimals = Math.floor(diffDaysWithDecimals);
  const dayDecimals = diffDaysWithDecimals - diffDaysWithoutDecimals;
  const diffHoursWithDecimals = dayDecimals * 24;
  const diffHoursWithoutDecimals = Math.floor(diffHoursWithDecimals);
  const hourDecimals = diffHoursWithDecimals - diffHoursWithoutDecimals;
  const diffMinsWithDecimals = hourDecimals * 60;
  const diffMinsWithoutDecimals = Math.ceil(diffMinsWithDecimals);
  const examTime_hour = Number(String(course.exam_time).split(":")[0]);
  const examTime_mins = Number(String(course.exam_time).split(":")[1]);

  if (!Number.isFinite(diffDaysWithoutDecimals)) {
    return "-";
  }

  return (
    "Due in " +
    diffDaysWithoutDecimals +
    " day(s) and " +
    diffHoursWithoutDecimals +
    " hour(s) and " +
    diffMinsWithoutDecimals +
    " min(s) with " +
    examTime_hour +
    " more hour(s) and " +
    examTime_mins +
    " min(s) on the exam day"
  );
};

//..................................

const COURSE_PRINT_SOUND_START_OFFSET = 0.109;
const COURSE_PRINT_SOUND_BASE_DURATION = 26.204;
const NAGHAM_COURSE_LETTERS_STORAGE_KEY = "schoolPlanner_nagham_course_letters";
const NAGHAM_COURSE_LIST_STORAGE_KEY = "schoolPlanner_nagham_course_list";
const SCHOOLPLANNER_MUSIC_STORAGE_KEY = "schoolPlanner_music_archive_items";
const DEFAULT_NAGHAM_COURSE_LETTER =
  "For dear naghamtrkmani: keep going, keep glowing, and let every page carry you a little closer to your beautiful goal.";
const TELEGRAM_DISPLAY_TIMEZONE = "Asia/Damascus";
const INTERNET_ARCHIVE_CLASSICAL_ITEMS = [
  {
    identifier: "MoonlightSonata_755",
    fallbackTitle: "Moonlight Sonata",
    fallbackCreator: "Beethoven",
  },
  {
    identifier: "fur-elise-by-beethoven-beethoven",
    fallbackTitle: "Fur Elise",
    fallbackCreator: "Beethoven",
  },
  {
    identifier: "gymnopedie-no.-1",
    fallbackTitle: "Gymnopedie No. 1",
    fallbackCreator: "Erik Satie",
  },
  {
    identifier: "NocturneCSharpMinor",
    fallbackTitle: "Nocturne in C# Minor",
    fallbackCreator: "Chopin",
  },
];

const buildInternetArchiveDownloadUrl = (identifier, fileName) =>
  `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`;

const getInternetArchivePlayableFile = (files = []) => {
  const preferredFile = files.find((file) => {
    const format = String(file?.format || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();

    return (
      name.endsWith(".mp3") &&
      !name.endsWith(".zip") &&
      !name.endsWith(".m3u") &&
      (format.includes("vbr mp3") ||
        format.includes("192kbps mp3") ||
        format.includes("64kbps mp3") ||
        format.includes("mp3"))
    );
  });

  return preferredFile || null;
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
  )}&fl[]=identifier,title,creator&sort[]=downloads desc&rows=1&page=1&output=json`;
};

const buildResolvedArchiveTrack = (item, payload) => {
  const playableFile = getInternetArchivePlayableFile(payload?.files);

  if (!playableFile?.name) {
    return null;
  }

  const title =
    playableFile.title ||
    payload?.metadata?.title ||
    item.fallbackTitle ||
    item.identifier;
  const artist =
    playableFile.creator ||
    playableFile.artist ||
    payload?.metadata?.creator ||
    item.fallbackCreator ||
    "Internet Archive";

  return {
    identifier: item.identifier,
    title,
    artist: Array.isArray(artist) ? artist.join(", ") : artist,
    src: buildInternetArchiveDownloadUrl(item.identifier, playableFile.name),
  };
};

const getConfiguredInternetArchiveItems = () => {
  if (typeof window === "undefined") {
    return INTERNET_ARCHIVE_CLASSICAL_ITEMS;
  }

  try {
    const storedIdentifiers = JSON.parse(
      window.localStorage.getItem(SCHOOLPLANNER_MUSIC_STORAGE_KEY) || "[]",
    );

    if (!Array.isArray(storedIdentifiers) || storedIdentifiers.length === 0) {
      return INTERNET_ARCHIVE_CLASSICAL_ITEMS;
    }

    return storedIdentifiers
      .map((identifier) => String(identifier || "").trim())
      .filter(Boolean)
      .map((identifier) => {
        const matchingDefaultItem = INTERNET_ARCHIVE_CLASSICAL_ITEMS.find(
          (item) => item.identifier === identifier,
        );

        return (
          matchingDefaultItem || {
            identifier,
            fallbackTitle: identifier.replace(/[-_]+/g, " "),
            fallbackCreator: "Internet Archive",
          }
        );
      });
  } catch (error) {
    return INTERNET_ARCHIVE_CLASSICAL_ITEMS;
  }
};

export default class SchoolPlanner extends Component {
  constructor(props) {
    super(props);

    this.state = {
      lectures: [],
      courses: [],
      course_isLoading: false,
      lecture_isLoading: false,
      music_isPlaying: false,
      music_volume: 0.42,
      music_trackTitle: "Archive Classics",
      music_trackArtist: "Internet Archive",
      music_isLoading: false,
      telegram_isLoading: false,
      telegram_error: "",
      telegram_messages: [],
      telegram_groupTitle: "Telegram Group",
      telegram_groupReference: "",
      telegram_groupInput: "",
      telegram_feedback: "",
      telegram_isSaving: false,
      telegram_limit: 20,
      telegram_hasMore: true,
    };

    this.coursePrintAudio = null;
    this.coursePrintSoundTimeouts = [];
    this.courseDetailsTypingTimeouts = [];
    this.musicAudioRef = React.createRef();
    this.musicPlaylist = [];
    this.musicTrackIndex = 0;
    this.musicLibraryPromise = null;
    this.isComponentMounted = false;
  }

  componentDidMount() {
    this.isComponentMounted = true;
    this.retrieveLectures();
    this.retrieveCourses();
    if (this.musicAudioRef.current) {
      this.musicAudioRef.current.volume = this.state.music_volume;
    }
    this.loadPlannerMusicLibrary();
    this.fetchTelegramConfig();
  }

  componentWillUnmount() {
    this.coursePrintSoundTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.coursePrintSoundTimeouts = [];
    this.courseDetailsTypingTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.courseDetailsTypingTimeouts = [];
    this.isComponentMounted = false;
    this.stopCoursePrintSound();
    if (this.musicAudioRef.current) {
      this.musicAudioRef.current.pause();
      this.musicAudioRef.current.currentTime = 0;
      this.musicAudioRef.current.removeAttribute("src");
      this.musicAudioRef.current.load();
    }
  }

  resolveInternetArchiveTrack = async (item) => {
    try {
      const metadataResponse = await fetch(
        `https://archive.org/metadata/${encodeURIComponent(item.identifier)}`,
      );

      if (metadataResponse.ok) {
        const metadataPayload = await metadataResponse.json();
        const resolvedFromIdentifier = buildResolvedArchiveTrack(
          item,
          metadataPayload,
        );

        if (resolvedFromIdentifier) {
          return resolvedFromIdentifier;
        }
      }
    } catch (error) {
      // Fall through to search mode.
    }

    try {
      const searchResponse = await fetch(
        buildInternetArchiveSearchUrl(
          item.fallbackTitle || item.identifier || item.fallbackCreator,
        ),
      );

      if (!searchResponse.ok) {
        return null;
      }

      const searchPayload = await searchResponse.json();
      const matchedDoc = searchPayload?.response?.docs?.[0];

      if (!matchedDoc?.identifier) {
        return null;
      }

      const matchedIdentifier = String(matchedDoc.identifier).trim();
      const metadataResponse = await fetch(
        `https://archive.org/metadata/${encodeURIComponent(matchedIdentifier)}`,
      );

      if (!metadataResponse.ok) {
        return null;
      }

      const metadataPayload = await metadataResponse.json();

      return buildResolvedArchiveTrack(
        {
          ...item,
          identifier: matchedIdentifier,
          fallbackTitle:
            matchedDoc.title || item.fallbackTitle || matchedIdentifier,
          fallbackCreator:
            matchedDoc.creator || item.fallbackCreator || "Internet Archive",
        },
        metadataPayload,
      );
    } catch (error) {
      return null;
    }
  };

  loadPlannerMusicLibrary = async () => {
    if (this.musicPlaylist.length > 0) {
      return this.musicPlaylist;
    }

    if (this.musicLibraryPromise) {
      return this.musicLibraryPromise;
    }

    this.setState({
      music_isLoading: true,
    });

    const configuredArchiveItems = getConfiguredInternetArchiveItems();

    this.musicLibraryPromise = Promise.all(
      configuredArchiveItems.map((item) =>
        this.resolveInternetArchiveTrack(item),
      ),
    )
      .then((tracks) => tracks.filter(Boolean))
      .catch(() => [])
      .finally(() => {
        this.musicLibraryPromise = null;
      });

    const resolvedTracks = await this.musicLibraryPromise;

    if (!this.isComponentMounted) {
      return resolvedTracks;
    }

    this.musicPlaylist = resolvedTracks;
    this.setState({
      music_isLoading: false,
    });

    if (this.musicPlaylist.length > 0 && this.musicAudioRef.current) {
      this.setPlannerMusicTrack(0);
    } else if (this.isComponentMounted) {
      this.setState({
        music_trackTitle: "Archive Unavailable",
        music_trackArtist: "Try again later",
      });
    }

    return this.musicPlaylist;
  };

  setPlannerMusicTrack = (trackIndex, autoplay = false) => {
    const musicAudio = this.musicAudioRef.current;
    const track = this.musicPlaylist[trackIndex];

    if (!musicAudio || !track) return;

    this.musicTrackIndex = trackIndex;
    musicAudio.pause();
    musicAudio.src = track.src;
    musicAudio.load();
    musicAudio.volume = this.state.music_volume;

    this.setState({
      music_trackTitle: track.title,
      music_trackArtist: track.artist,
    });

    if (autoplay) {
      musicAudio.play().catch(() => {});
    }
  };

  playPreviousPlannerMusicTrack = async (autoplay = true) => {
    const playlist =
      this.musicPlaylist.length > 0
        ? this.musicPlaylist
        : await this.loadPlannerMusicLibrary();

    if (!playlist || playlist.length === 0) {
      return;
    }

    const previousIndex =
      (this.musicTrackIndex - 1 + playlist.length) % playlist.length;
    this.setPlannerMusicTrack(previousIndex, autoplay);
  };

  playNextPlannerMusicTrack = async (autoplay = true) => {
    const playlist =
      this.musicPlaylist.length > 0
        ? this.musicPlaylist
        : await this.loadPlannerMusicLibrary();

    if (!playlist || playlist.length === 0) {
      return;
    }

    const nextIndex = (this.musicTrackIndex + 1) % playlist.length;
    this.setPlannerMusicTrack(nextIndex, autoplay);
  };

  togglePlannerMusic = async () => {
    const musicAudio = this.musicAudioRef.current;
    if (!musicAudio) return;

    if (musicAudio.paused) {
      if (!musicAudio.src) {
        const playlist = await this.loadPlannerMusicLibrary();
        if (!playlist || playlist.length === 0) {
          return;
        }
      }
      musicAudio.volume = this.state.music_volume;
      musicAudio.play().catch(() => {});
    } else {
      musicAudio.pause();
    }
  };

  updatePlannerMusicVolume = (event) => {
    const nextVolume = Number(event.target.value);

    this.setState({
      music_volume: nextVolume,
    });

    if (this.musicAudioRef.current) {
      this.musicAudioRef.current.volume = nextVolume;
    }
  };

  fetchTelegramConfig = async () => {
    if (!this.props.state?.token) {
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/telegram/config"), {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${this.props.state.token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load Telegram config.");
      }

      if (this.isComponentMounted) {
        this.setState(
          {
            telegram_groupReference: String(payload?.groupReference || ""),
            telegram_groupInput: String(payload?.groupReference || ""),
            telegram_groupTitle: payload?.groupReference
              ? String(payload.groupReference)
              : "Telegram Group",
          },
          () => {
            this.fetchTelegramGroupMessages();
          },
        );
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_error:
            error?.message || "Unable to load Telegram configuration.",
        });
      }
    }
  };

  fetchTelegramGroupMessages = async () => {
    if (!this.props.state?.token) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_isLoading: false,
          telegram_error: "Telegram messages need a valid login token.",
          telegram_messages: [],
          telegram_groupTitle: "Telegram Group",
          telegram_hasMore: false,
        });
      }
      return;
    }

    if (this.isComponentMounted) {
      this.setState({
        telegram_isLoading: true,
        telegram_error: "",
      });
    }

    try {
      const response = await fetch(
        apiUrl(
          `/api/telegram/group-messages?limit=${encodeURIComponent(
            this.state.telegram_limit,
          )}`,
        ),
        {
          method: "GET",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${this.props.state.token}`,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to load Telegram group messages.",
        );
      }

      if (this.isComponentMounted) {
        this.setState({
          telegram_isLoading: false,
          telegram_error: "",
          telegram_messages: Array.isArray(payload?.messages)
            ? payload.messages
            : [],
          telegram_hasMore:
            Array.isArray(payload?.messages) &&
            payload.messages.length >= this.state.telegram_limit &&
            this.state.telegram_limit < 100,
          telegram_groupTitle:
            payload?.group?.title ||
            payload?.group?.username ||
            "Telegram Group",
        });
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_isLoading: false,
          telegram_error:
            error?.message || "Unable to load Telegram group messages.",
          telegram_messages: [],
          telegram_hasMore: false,
        });
      }
    }
  };

  loadMoreTelegramMessages = () => {
    if (this.state.telegram_isLoading || !this.state.telegram_hasMore) {
      return;
    }

    this.setState(
      (currentState) => ({
        telegram_limit: Math.min(100, currentState.telegram_limit + 20),
      }),
      () => {
        this.fetchTelegramGroupMessages();
      },
    );
  };

  updateTelegramGroupInput = (event) => {
    const nextValue = String(event.target.value || "");

    this.setState((currentState) => ({
      telegram_groupInput: nextValue,
      telegram_feedback:
        currentState.telegram_feedback &&
        currentState.telegram_feedback.startsWith("Saved")
          ? ""
          : currentState.telegram_feedback,
    }));
  };

  saveTelegramConfig = async () => {
    if (!this.props.state?.token || this.state.telegram_isSaving) {
      return;
    }

    this.setState({
      telegram_isSaving: true,
      telegram_feedback: "",
    });

    try {
      const response = await fetch(apiUrl("/api/telegram/config"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.props.state.token}`,
        },
        body: JSON.stringify({
          groupReference: String(this.state.telegram_groupInput || "").trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to save Telegram settings.",
        );
      }

      if (this.isComponentMounted) {
        this.setState(
          {
            telegram_isSaving: false,
            telegram_feedback:
              payload?.message || "Saved SchoolPlanner Telegram settings.",
            telegram_groupReference: String(payload?.groupReference || ""),
            telegram_groupInput: String(payload?.groupReference || ""),
            telegram_groupTitle: payload?.groupReference
              ? String(payload.groupReference)
              : this.state.telegram_groupTitle,
          },
          () => {
            this.fetchTelegramGroupMessages();
          },
        );
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_isSaving: false,
          telegram_feedback:
            error?.message || "Unable to save Telegram settings.",
        });
      }
    }
  };

  getTelegramMessageDate = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      const normalizedValue =
        Math.abs(value) < 1000000000000 ? value * 1000 : value;
      return new Date(normalizedValue);
    }

    if (typeof value === "string" && value.trim()) {
      const nextDate = new Date(value);
      return Number.isNaN(nextDate.getTime()) ? null : nextDate;
    }

    return null;
  };

  formatTelegramDayLabel = (value) => {
    const nextDate = this.getTelegramMessageDate(value);

    if (!nextDate) {
      return "Unknown day";
    }

    return nextDate.toLocaleDateString(undefined, {
      timeZone: TELEGRAM_DISPLAY_TIMEZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  formatTelegramDateTime = (value) => {
    const nextDate = this.getTelegramMessageDate(value);

    if (!nextDate) {
      return "";
    }

    return nextDate.toLocaleString(undefined, {
      timeZone: TELEGRAM_DISPLAY_TIMEZONE,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  groupTelegramMessagesByDay = (messages = []) => {
    const groupedMessagesMap = new Map();

    messages.forEach((message) => {
      const dayKey = this.formatTelegramDayLabel(message?.date);

      if (!groupedMessagesMap.has(dayKey)) {
        groupedMessagesMap.set(dayKey, []);
      }

      groupedMessagesMap.get(dayKey).push(message);
    });

    return Array.from(groupedMessagesMap.entries()).map(
      ([dayLabel, items]) => ({
        dayLabel,
        items,
      }),
    );
  };

  playCoursePrintSound = (printDurationMs = 0) => {
    if (!this.coursePrintAudio) {
      this.coursePrintAudio = new Audio("/sounds/schoolplanner-typing.wav");
      this.coursePrintAudio.preload = "auto";
    }

    this.coursePrintSoundTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.coursePrintSoundTimeouts = [];

    this.coursePrintAudio.pause();
    this.coursePrintAudio.currentTime = COURSE_PRINT_SOUND_START_OFFSET;
    this.coursePrintAudio.volume = 0.42;
    if (printDurationMs > 0) {
      const printDurationSeconds = printDurationMs / 1000;
      const playbackRate = Math.min(
        2.5,
        Math.max(0.45, COURSE_PRINT_SOUND_BASE_DURATION / printDurationSeconds),
      );
      this.coursePrintAudio.playbackRate = playbackRate;
      this.coursePrintAudio.loop =
        printDurationSeconds > COURSE_PRINT_SOUND_BASE_DURATION / playbackRate;
    } else {
      this.coursePrintAudio.playbackRate = 1;
      this.coursePrintAudio.loop = true;
    }
    this.coursePrintAudio.play().catch(() => {});
  };

  stopCoursePrintSound = () => {
    this.coursePrintSoundTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.coursePrintSoundTimeouts = [];

    if (!this.coursePrintAudio) return;

    this.coursePrintAudio.pause();
    this.coursePrintAudio.currentTime = COURSE_PRINT_SOUND_START_OFFSET;
  };

  getNaghamCourseLetter = (course) => {
    if (typeof window === "undefined") {
      return DEFAULT_NAGHAM_COURSE_LETTER;
    }

    try {
      const storedLetters = JSON.parse(
        window.localStorage.getItem(NAGHAM_COURSE_LETTERS_STORAGE_KEY) || "{}",
      );

      return (
        storedLetters?.[course?._id] ||
        storedLetters?.[course?.course_name] ||
        ""
      );
    } catch (error) {
      return "";
    }
  };

  updateCoursePrintReveal = (node, immediate = false) => {
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    if (!detailsDiv) return;

    if (!node) {
      detailsDiv.style.transition = immediate
        ? "none"
        : "clip-path 130ms ease-out, opacity 100ms linear, filter 120ms linear";
      detailsDiv.style.clipPath = "inset(0 0 100% 0)";
      detailsDiv.style.opacity = "0.42";
      detailsDiv.style.filter = "saturate(0.7) brightness(1.08)";
      return;
    }

    const detailsRect = detailsDiv.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const trailingPaperSpace =
      detailsDiv
        .querySelector(".schoolPlanner_courses_printSpacer")
        ?.getBoundingClientRect().height || 56;
    const revealedHeight = Math.max(
      0,
      nodeRect.bottom - detailsRect.top + 12 + trailingPaperSpace,
    );
    const hiddenBottom = Math.max(0, detailsRect.height - revealedHeight);

    const targetOpacity = hiddenBottom > 0 ? "0.78" : "1";
    const targetFilter =
      hiddenBottom > 0
        ? "saturate(0.88) brightness(1.03)"
        : "saturate(1) brightness(1)";

    if (immediate) {
      detailsDiv.style.transition = "none";
      detailsDiv.style.clipPath = `inset(0 0 ${hiddenBottom}px 0)`;
      detailsDiv.style.opacity = targetOpacity;
      detailsDiv.style.filter = targetFilter;
      return;
    }

    const hesitationBottom = Math.max(0, hiddenBottom + 10);
    detailsDiv.style.transition =
      "clip-path 58ms ease-out, opacity 58ms linear, filter 58ms linear";
    detailsDiv.style.clipPath = `inset(0 0 ${hesitationBottom}px 0)`;
    detailsDiv.style.opacity = targetOpacity;
    detailsDiv.style.filter = targetFilter;

    const timeoutId = window.setTimeout(() => {
      detailsDiv.style.transition =
        "clip-path 92ms ease-out, opacity 92ms linear, filter 92ms linear";
      detailsDiv.style.clipPath = `inset(0 0 ${hiddenBottom}px 0)`;
      detailsDiv.style.opacity = targetOpacity;
      detailsDiv.style.filter = targetFilter;
    }, 72);
    this.courseDetailsTypingTimeouts.push(timeoutId);
  };

  keepCoursePrintLineVisible = (node) => {
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    if (!detailsDiv || !node) return;

    let actionsMount = document.getElementById(
      "schoolPlanner_courses_actions_mount",
    );
    const detailsRect = detailsDiv.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const actionsRect = actionsMount
      ? actionsMount.getBoundingClientRect()
      : null;
    const visibleTop = detailsRect.top + 12;
    const visibleBottom = actionsRect
      ? Math.min(detailsRect.bottom, actionsRect.top - 12)
      : detailsRect.bottom - 12;

    if (nodeRect.bottom > visibleBottom) {
      detailsDiv.scrollTop += nodeRect.bottom - visibleBottom;
    } else if (nodeRect.top < visibleTop) {
      detailsDiv.scrollTop -= visibleTop - nodeRect.top;
    }
  };

  setPageFinishLecture = async (lecture, pageNum, boolean) => {
    let div_progression = document.getElementById("div_progression");
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/setPageFinishLecture/") +
      this.props.state.my_id +
      "/" +
      lecture._id +
      "/" +
      boolean;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pageNum: pageNum,
      }),
    };
    let req = new Request(url, options);
    await fetch(req)
      .then((result) => {
        if (result.status === 201) {
          return result.json();
        }
      })
      .then((result) => {
        let lecture = result.lectureFound;
        this.setState({
          lecture_isLoading: false,
        });
        let p_progression = div_progression.children[1];
        let div_indicator_progression = div_progression.children[2].children[0];
        let progressionStats = getProgressStats(
          lecture.lecture_progress,
          lecture.lecture_length,
        );
        p_progression.textContent = String(
          progressionStats.length +
            " (" +
            progressionStats.progress +
            " : " +
            progressionStats.remaining +
            " | " +
            progressionStats.percent +
            "%)",
        );
        div_indicator_progression.style.width =
          progressionStats.indicatorWidth + "px";
        if (progressionStats.percent < 50)
          div_indicator_progression.style.backgroundColor = "var(--red2)";
      });
  };
  hideUncheckedLectures = () => {
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/hideUncheckedLectures/") + this.props.state.my_id;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        this.setState({
          lecture_isLoading: false,
        });
        this.retrieveLectures();
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="none"
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="inline"
      }
    });
  };
  unhideUncheckedLectures = () => {
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/unhideUncheckedLectures/") + this.props.state.my_id;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        this.setState({
          lecture_isLoading: false,
        });
        this.retrieveLectures();
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="inline"
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="none"
      }
    });
  };

  calculateLectureNum = () => {
    return;
  };

  appendLectureRow = (tbody, lecture, progressionStats, interactivePages) => {
    let titleCell = document.createElement("td");
    let courseCell = document.createElement("td");
    let instructorCell = document.createElement("td");
    let writerCell = document.createElement("td");
    let dateCell = document.createElement("td");

    let progressionText = document.createElement("p");
    let div_indicatorBox_progression = document.createElement("div");
    let div_indicator_progression = document.createElement("div");
    let ul_pages_finished = document.createElement("ul");
    let div_progression = document.createElement("div");

    let div_outline = document.createElement("div");
    let checkBox_partOfPlan = document.createElement("input");
    let div_partOfPlan = document.createElement("div");

    let row = document.createElement("tr");
    let menuCell = document.createElement("td");
    let progressionCell = document.createElement("td");
    let planCell = document.createElement("td");
    let menu_editIcon = document.createElement("i");
    let titleText = document.createElement("p");

    titleText.textContent = lecture.lecture_name;
    courseCell.textContent = lecture.lecture_course;
    instructorCell.textContent = lecture.lecture_instructor;
    writerCell.textContent = lecture.lecture_writer;
    dateCell.textContent = lecture.lecture_date;
    progressionText.textContent = String(
      progressionStats.length +
        " (" +
        progressionStats.progress +
        " : " +
        progressionStats.remaining +
        " | " +
        progressionStats.percent +
        "%)",
    );

    for (var i = 0; i < lecture.lecture_outlines.length; i++) {
      let p = document.createElement("p");
      p.textContent = Number(i + 1) + ") " + lecture.lecture_outlines[i];
      div_outline.append(p);
    }

    row.setAttribute("class", "menuLi_div schoolPlanner_lecture_row");
    row.setAttribute("id", lecture._id + "li");
    menuCell.setAttribute("class", "lecuturesTable_menu_div");
    progressionCell.setAttribute(
      "class",
      "schoolPlanner_lecture_progressionCell",
    );
    planCell.setAttribute("class", "schoolPlanner_lecture_planCell");
    titleCell.setAttribute("class", "schoolPlanner_lecture_titleCell");
    titleText.setAttribute("class", "schoolPlanner_lecture_titleText");
    menu_editIcon.setAttribute("class", "fi fi-rr-pencil");
    menu_editIcon.setAttribute("title", "Edit lecture");
    menu_editIcon.setAttribute("id", lecture._id + "menu_editIcon");
    div_outline.setAttribute("class", "div_outline fc");

    checkBox_partOfPlan.type = "checkbox";
    div_partOfPlan.setAttribute("class", "div_partOfPlan fc");
    checkBox_partOfPlan.setAttribute("id", lecture._id + "checkBox_partOfPlan");
    checkBox_partOfPlan.setAttribute(
      "class",
      "schoolPlanner_partOfPlan_checkbox",
    );

    if (lecture.lecture_partOfPlan === true) checkBox_partOfPlan.checked = true;

    div_indicatorBox_progression.setAttribute(
      "class",
      "div_indicatorBox_progression",
    );
    div_indicator_progression.setAttribute(
      "class",
      "div_indicator_progression",
    );
    div_indicator_progression.setAttribute(
      "id",
      lecture._id + "div_indicator_progression",
    );
    ul_pages_finished.setAttribute("class", "ul_pages_finished");
    div_progression.setAttribute("class", "div_progression fc");
    div_progression.setAttribute("id", lecture._id + "div_progression");

    div_indicator_progression.style.width =
      progressionStats.indicatorWidth + "px";
    if (progressionStats.percent < 50)
      div_indicator_progression.style.backgroundColor = "var(--red2)";

    for (var pageIndex = 0; pageIndex < lecture.lecture_length; pageIndex++) {
      let pagenumber = Number(pageIndex + 1);
      let p_num = document.createElement("p");
      p_num.textContent = Number(pageIndex + 1);

      if (interactivePages === true) {
        p_num.addEventListener("click", () => {
          this.setState({
            lecture_isLoading: true,
          });
          setTimeout(() => {
            if (lecture.lecture_pagesFinished.indexOf(pagenumber) == -1) {
              this.setPageFinishLecture(lecture, pagenumber, true);
              p_num.style.backgroundColor = "var(--green4)";
              p_num.style.color = "var(--white)";
              p_num.style.fontWeight = "bold";
            } else {
              this.setPageFinishLecture(lecture, p_num.textContent, false);
              p_num.style.backgroundColor = "var(--white2)";
              p_num.style.color = "black";
              p_num.style.fontWeight = "normal";
            }
          }, 3000);
        });
      }

      for (var j = 0; j < lecture.lecture_pagesFinished.length; j++) {
        if (lecture.lecture_pagesFinished.indexOf(pagenumber) !== -1) {
          p_num.style.backgroundColor = "var(--green4)";
          p_num.style.color = "var(--white)";
          p_num.style.fontWeight = "bold";
        }
      }
      ul_pages_finished.append(p_num);
    }

    menu_editIcon.addEventListener("click", () => {
      lectureInEdit = lecture;
      this.openAddLectureForm({
        buttonName: "Edit",
        _id: lecture._id,
        lecture_name: lecture.lecture_name,
        lecture_course: lecture.lecture_course,
        lecture_instructor: lecture.lecture_instructor,
        lecture_writer: lecture.lecture_writer,
        lecture_date: lecture.lecture_date,
        lecture_length: lecture.lecture_length,
        lecture_progress: lecture.lecture_progress,
        lecture_outlines: lecture.lecture_outlines,
        lecture_partOfPlan: lecture.lecture_partOfPlan,
        lecture_hidden: lecture.lecture_hidden,
      });
    });

    checkBox_partOfPlan.addEventListener("click", () => {
      this.editLecture({
        _id: lecture._id,
        lecture_name: lecture.lecture_name,
        lecture_course: lecture.lecture_course,
        lecture_instructor: lecture.lecture_instructor,
        lecture_writer: lecture.lecture_writer,
        lecture_date: lecture.lecture_date,
        lecture_length: lecture.lecture_length,
        lecture_progress: lecture.lecture_progress,
        lecture_pagesFinished: lecture.lecture_pagesFinished,
        lecture_outlines: lecture.lecture_outlines,
        lecture_partOfPlan: checkBox_partOfPlan.checked === true,
        lecture_hidden: lecture.lecture_hidden,
      });
    });

    if (interactivePages === true) {
      div_progression.addEventListener("click", () => {
        let div_progressionInHTML = document.getElementById(
          lecture._id + "div_progression",
        );
        let i_close = document.createElement("i");
        i_close.setAttribute("class", "fi fi-rr-cross-circle");
        div_progressionInHTML.innerHTML = "";
        i_close.addEventListener("click", () => {
          ul_pages_finished.style.padding = "0px";
          div_progressionInHTML.append(
            progressionText,
            div_indicatorBox_progression,
            ul_pages_finished,
          );
        });
        ul_pages_finished.style.height = "fit-content";
        ul_pages_finished.style.padding = "10px";
        div_progressionInHTML.style.display = "flex";
        div_progressionInHTML.append(
          i_close,
          progressionText,
          div_indicatorBox_progression,
          ul_pages_finished,
        );
      });
    }

    titleCell.append(titleText);
    if (lecture.lecture_outlines.length > 0) titleCell.append(div_outline);
    menuCell.append(menu_editIcon);
    div_indicatorBox_progression.append(div_indicator_progression);
    div_progression.append(
      progressionText,
      div_indicatorBox_progression,
      ul_pages_finished,
    );
    progressionCell.append(div_progression);
    div_partOfPlan.appendChild(checkBox_partOfPlan);
    planCell.append(div_partOfPlan);
    row.append(
      menuCell,
      titleCell,
      courseCell,
      instructorCell,
      writerCell,
      dateCell,
      progressionCell,
      planCell,
    );
    tbody.prepend(row);
  };

  openAddLectureForm = (object) => {
    document.getElementById("schoolPlanner_addLecture_div").style.display =
      "flex";
    document.getElementById(
      "schoolPlanner_addLecture_addButton_label",
    ).textContent = object.buttonName;
    //.........
    if (object.buttonName === "Add") {
      lectureOutlines = [];
      document.getElementById("schoolPlanner_addLecture_name_input").value = "";
      document.getElementById("schoolPlanner_addLecture_course_input").value =
        "Lecture course";
      document.getElementById(
        "schoolPlanner_addLecture_instructorName_input",
      ).value = "Lecture instructor name";
      document.getElementById(
        "schoolPlanner_addLecture_writerName_input",
      ).value = "";
      document.getElementById("schoolPlanner_addLecture_date_input").value =
        "Lecture date";
      document.getElementById("schoolPlanner_addLecture_length_input").value =
        "";
      document.getElementById("schoolPlanner_addLecture_outlines_input").value =
        "";
    }
    if (object.buttonName === "Edit") {
      selectedLecture = object._id;
      lectureOutlines = object.lecture_outlines;
      document.getElementById("schoolPlanner_addLecture_name_input").value =
        object.lecture_name;
      document.getElementById("schoolPlanner_addLecture_course_input").value =
        object.lecture_course;
      document.getElementById(
        "schoolPlanner_addLecture_instructorName_input",
      ).value = object.lecture_instructor;
      document.getElementById(
        "schoolPlanner_addLecture_writerName_input",
      ).value = object.lecture_writer;
      document.getElementById("schoolPlanner_addLecture_date_input").value =
        object.lecture_date;
      document.getElementById("schoolPlanner_addLecture_length_input").value =
        object.lecture_length;
      document.getElementById("schoolPlanner_addLecture_outlines_input").value =
        "";

      this.retrieveLectureOutlines();
    }
  };
  closeAddLectureForm = () => {
    document.getElementById("schoolPlanner_addLecture_div").style.display =
      "none";
  };
  openAddCourseForm = (object) => {
    document.getElementById("schoolPlanner_addCourse_div").style.display =
      "flex";
    document.getElementById(
      "schoolPlanner_addCourse_addButton_label",
    ).textContent = object.buttonName;
    if (object.buttonName === "Add") {
      courseDayAndTime = [];
      courseInstructorsNames = [];
      courseExams = [];
      document.getElementById("schoolPlanner_addCourse_name_input").value = "";
      document.getElementById("schoolPlanner_addCourse_component_input").value =
        "Course component";
      document.getElementById("schoolPlanner_addCourse_day_input").value =
        "Course day";
      document.getElementById("schoolPlanner_addCourse_time_hour_input").value =
        "";
      document.getElementById(
        "schoolPlanner_addCourse_time_minute_input",
      ).value = "";
      document.getElementById("schoolPlanner_addCourse_year_input").value =
        "Course year";
      document.getElementById("schoolPlanner_addCourse_term_input").value =
        "Course term";
      document.getElementById("schoolPlanner_addCourse_class_input").value =
        "Course classification";
      document.getElementById("schoolPlanner_addCourse_status_input").value =
        "Course status";
      document.getElementById("schoolPlanner_addCourse_grade_input").value = "";
      document.getElementById("schoolPlanner_addCourse_fullGrade_input").value =
        "";
      document.getElementById("schoolPlanner_addCourse_examType_input").value =
        "Exam type";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_day_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_month_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_year_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examTime_hour_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examTime_minute_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_instructorName_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_instructorsNames_ul",
      ).innerHTML = "";
      document.getElementById(
        "schoolPlanner_addCourse_dayAndTime_ul",
      ).innerHTML = "";
      document.getElementById("schoolPlanner_addCourse_exams_ul").innerHTML =
        "";
    }
    if (object.buttonName === "Edit") {
      courseDayAndTime = object.course.course_dayAndTime;
      courseInstructorsNames = object.course.course_instructors;
      courseExams =
        object.course.course_exams && object.course.course_exams.length > 0
          ? object.course.course_exams
          : object.course.exam_date ||
              object.course.exam_time ||
              object.course.exam_type ||
              object.course.course_grade ||
              object.course.course_fullGrade
            ? [
                {
                  exam_type: object.course.exam_type || "-",
                  exam_date: object.course.exam_date || "-",
                  exam_time: object.course.exam_time || "-",
                  course_grade: object.course.course_grade || "",
                  course_fullGrade: object.course.course_fullGrade || "",
                },
              ]
            : [];
      //.........
      document.getElementById("schoolPlanner_addCourse_name_input").value =
        object.course.course_name.split(" (")[0];
      document.getElementById("schoolPlanner_addCourse_component_input").value =
        object.course.course_component;
      document.getElementById("schoolPlanner_addCourse_day_input").value =
        "Course day";
      document.getElementById("schoolPlanner_addCourse_time_hour_input").value =
        "";
      document.getElementById(
        "schoolPlanner_addCourse_time_minute_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_dayAndTime_ul",
      ).innerHTML = "";
      document.getElementById("schoolPlanner_addCourse_year_input").value =
        object.course.course_year;
      document.getElementById("schoolPlanner_addCourse_term_input").value =
        object.course.course_term;
      document.getElementById("schoolPlanner_addCourse_class_input").value =
        object.course.course_class;
      document.getElementById("schoolPlanner_addCourse_status_input").value =
        object.course.course_status;
      document.getElementById(
        "schoolPlanner_addCourse_instructorName_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_instructorsNames_ul",
      ).innerHTML = "";
      document.getElementById("schoolPlanner_addCourse_grade_input").value =
        object.course.course_grade;
      document.getElementById("schoolPlanner_addCourse_fullGrade_input").value =
        object.course.course_fullGrade;
      document.getElementById("schoolPlanner_addCourse_examType_input").value =
        object.course.exam_type || "Exam type";
      const examDateParts = formatExamDateParts(object.course.exam_date);
      document.getElementById(
        "schoolPlanner_addCourse_examDate_day_input",
      ).value = examDateParts.day;
      document.getElementById(
        "schoolPlanner_addCourse_examDate_month_input",
      ).value = examDateParts.month;
      document.getElementById(
        "schoolPlanner_addCourse_examDate_year_input",
      ).value = examDateParts.year;
      const examTimeParts = formatExamTimeParts(object.course.exam_time);
      document.getElementById(
        "schoolPlanner_addCourse_examTime_hour_input",
      ).value = examTimeParts.hour;
      document.getElementById(
        "schoolPlanner_addCourse_examTime_minute_input",
      ).value = examTimeParts.minute;
      //................
      this.retrieveCourseDayAndTime();
      this.retrieveCourseInstructorsNames();
      this.retrieveCourseExams();
    }
  };
  closeAddCourseForm = () => {
    document.getElementById("schoolPlanner_addCourse_div").style.display =
      "none";
  };
  addCourseDayAndTime = (object) => {
    if (object.day && object.time) {
      courseDayAndTime.push({
        day: object.day,
        time: object.time,
      });
      document.getElementById("schoolPlanner_addCourse_day_input").value =
        "Course day";
      document.getElementById("schoolPlanner_addCourse_time_hour_input").value =
        "";
      document.getElementById(
        "schoolPlanner_addCourse_time_minute_input",
      ).value = "";
      this.retrieveCourseDayAndTime();
    }
  };

  addLectureOutline = () => {
    let outline = document.getElementById(
      "schoolPlanner_addLecture_outlines_input",
    ).value;
    lectureOutlines.push(outline);
    this.retrieveLectureOutlines();
  };

  addCourseInstructorsNames = () => {
    let instructorName = document.getElementById(
      "schoolPlanner_addCourse_instructorName_input",
    ).value;
    courseInstructorsNames.push(instructorName);
    this.retrieveCourseInstructorsNames();
  };
  addCourseExam = () => {
    const exam_type = document.getElementById(
      "schoolPlanner_addCourse_examType_input",
    ).value;
    const exam_date = buildExamDateValue({
      day: document.getElementById("schoolPlanner_addCourse_examDate_day_input")
        .value,
      month: document.getElementById(
        "schoolPlanner_addCourse_examDate_month_input",
      ).value,
      year: document.getElementById(
        "schoolPlanner_addCourse_examDate_year_input",
      ).value,
    });
    const exam_time = buildExamTimeValue({
      hour: document.getElementById(
        "schoolPlanner_addCourse_examTime_hour_input",
      ).value,
      minute: document.getElementById(
        "schoolPlanner_addCourse_examTime_minute_input",
      ).value,
    });
    const course_grade = document.getElementById(
      "schoolPlanner_addCourse_grade_input",
    ).value;
    const course_fullGrade = document.getElementById(
      "schoolPlanner_addCourse_fullGrade_input",
    ).value;

    if (exam_type && exam_date && exam_time) {
      courseExams.push({
        exam_type,
        exam_date,
        exam_time,
        course_grade,
        course_fullGrade,
      });
      document.getElementById("schoolPlanner_addCourse_examType_input").value =
        "Exam type";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_day_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_month_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_year_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examTime_hour_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examTime_minute_input",
      ).value = "";
      document.getElementById("schoolPlanner_addCourse_grade_input").value = "";
      document.getElementById("schoolPlanner_addCourse_fullGrade_input").value =
        "";
      this.retrieveCourseExams();
    }
  };
  retrieveCourseDayAndTime = () => {
    var courseDayAndTime_ul = document.getElementById(
      "schoolPlanner_addCourse_dayAndTime_ul",
    );
    courseDayAndTime_ul.innerHTML = "";
    for (var i = 0; i < courseDayAndTime.length; i++) {
      let p = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_dayAndTime = document.createElement("div");

      p.textContent = courseDayAndTime[i].day + " " + courseDayAndTime[i].time;

      deleteIcon.setAttribute("class", "fi fi-rr-x");
      deleteIcon.setAttribute("id", i + "DIdayAndTime");
      div_dayAndTime.setAttribute(
        "class",
        "schoolPlanner_addCourse_dayAndTime_div fr",
      );

      const removeDayAndTimeItem = () => {
        div_dayAndTime.remove();
        courseDayAndTime.splice(parseInt(deleteIcon.id), 1);
      };

      deleteIcon.addEventListener("click", () => {
        removeDayAndTimeItem();
      });
      p.addEventListener("click", () => {
        removeDayAndTimeItem();
      });
      div_dayAndTime.append(deleteIcon, p);
      courseDayAndTime_ul.appendChild(div_dayAndTime);
    }
  };
  retrieveLectureOutlines = () => {
    var ul_outlines = document.getElementById(
      "schoolPlanner_addLecture_outlines_ul",
    );
    ul_outlines.innerHTML = "";
    for (var i = 0; i < lectureOutlines.length; i++) {
      let p_lectureOutlines = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_lectureOutlines = document.createElement("div");

      p_lectureOutlines.textContent = lectureOutlines[i];

      div_lectureOutlines.setAttribute(
        "class",
        "schoolPlanner_addCourse_outlines_div fr",
      );
      deleteIcon.setAttribute("class", "fi fi-rr-x");
      deleteIcon.setAttribute("id", i + "DIlectureOutlines");
      deleteIcon.addEventListener("click", () => {
        deleteIcon.parentElement.remove();
        lectureOutlines.splice(parseInt(deleteIcon.id), 1);
      });
      div_lectureOutlines.append(deleteIcon, p_lectureOutlines);
      ul_outlines.append(div_lectureOutlines);
    }
  };
  retrieveCourseInstructorsNames = () => {
    let courseInstructorsNames_ul = document.getElementById(
      "schoolPlanner_addCourse_instructorsNames_ul",
    );
    courseInstructorsNames_ul.innerHTML = "";
    for (var i = 0; i < courseInstructorsNames.length; i++) {
      let p = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_instructorsNames = document.createElement("div");

      p.textContent = courseInstructorsNames[i];

      deleteIcon.setAttribute("class", "fi fi-rr-x");
      deleteIcon.setAttribute("id", i + "DIinstructorsNames");
      div_instructorsNames.setAttribute(
        "class",
        "schoolPlanner_addCourse_instructorsNames_div fr",
      );

      deleteIcon.addEventListener("click", () => {
        deleteIcon.parentElement.remove();
        courseInstructorsNames.splice(parseInt(deleteIcon.id), 1);
      });
      div_instructorsNames.append(deleteIcon, p);
      courseInstructorsNames_ul.appendChild(div_instructorsNames);
    }
  };
  retrieveCourseExams = () => {
    let courseExams_ul = document.getElementById(
      "schoolPlanner_addCourse_exams_ul",
    );
    courseExams_ul.innerHTML = "";
    for (var i = 0; i < courseExams.length; i++) {
      const examIndex = i;
      let p = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_exam = document.createElement("div");

      p.textContent =
        courseExams[i].exam_type +
        " | " +
        courseExams[i].exam_date +
        " | " +
        courseExams[i].exam_time +
        " | " +
        courseExams[i].course_grade +
        "/" +
        courseExams[i].course_fullGrade;

      deleteIcon.setAttribute("class", "fi fi-rr-x");
      div_exam.setAttribute("class", "schoolPlanner_addCourse_exams_div fr");

      const removeCourseExamItem = () => {
        courseExams.splice(examIndex, 1);
        this.retrieveCourseExams();
      };

      deleteIcon.addEventListener("click", () => {
        removeCourseExamItem();
      });
      p.addEventListener("click", () => {
        removeCourseExamItem();
      });
      div_exam.append(deleteIcon, p);
      courseExams_ul.appendChild(div_exam);
    }
  };
  renderCourseDetailsCard = (course) => {
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    let actionsMount = document.getElementById(
      "schoolPlanner_courses_actions_mount",
    );
    if (!detailsDiv) return;

    detailsDiv.innerHTML = "";
    if (actionsMount) actionsMount.innerHTML = "";

    if (!course) {
      this.hideCourseDetailsPanels();
      return;
    }

    const courseProgressStats = getProgressStats(
      course.course_progress,
      course.course_length,
    );
    const courseRows = [
      ["Course name", course.course_name || "-"],
      [
        "Course time",
        course.course_dayAndTime?.length
          ? course.course_dayAndTime
              .map((entry) => `${entry.day} ${entry.time}`)
              .join(" | ")
          : "-",
      ],
      [
        "Course year/term",
        `${course.course_term || "-"} ${course.course_year || "-"}`.trim(),
      ],
      ["Course class", course.course_class || "-"],
      ["Course status", course.course_status || "-"],
      [
        "Course instructors",
        course.course_instructors?.length
          ? course.course_instructors.join(" | ")
          : "-",
      ],
      [
        "Actual grade",
        `${course.course_grade || "-"} / ${course.course_fullGrade || "-"}`,
      ],
      [
        "Course pages",
        `${courseProgressStats.progress}/${courseProgressStats.length} (${courseProgressStats.percent}%)`,
      ],
      [
        "Target pages to study per day",
        String(
          getSafePagesPerDay(
            course.course_length,
            course.course_progress,
            Math.floor((new Date(course.exam_date) - todayDate) / 86400000),
          ),
        ),
      ],
    ];
    const examEntries =
      course.course_exams && course.course_exams.length > 0
        ? course.course_exams
        : course.exam_date || course.exam_time || course.exam_type
          ? [
              {
                exam_type: course.exam_type || "-",
                exam_date: course.exam_date || "-",
                exam_time: course.exam_time || "-",
                course_grade: course.course_grade || "-",
                course_fullGrade: course.course_fullGrade || "-",
              },
            ]
          : [];

    let actionsRow = document.createElement("div");
    actionsRow.setAttribute("id", "schoolPlanner_courses_actions");

    let editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      target_editCourse = course._id;
      this.openAddCourseForm({
        buttonName: "Edit",
        course: course,
      });
    });

    let deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      this.deleteCourseById(course._id);
    });

    let planButton = document.createElement("button");
    planButton.type = "button";
    planButton.textContent = course.course_partOfPlan
      ? "Remove From Plan"
      : "Add To Plan";
    planButton.addEventListener("click", () => {
      target_editCourse = course._id;
      this.partOfPlanCourse(
        course,
        `${course._id}menu_partOfPlan`,
        !course.course_partOfPlan,
      );
    });

    actionsRow.append(editButton, deleteButton, planButton);
    if (actionsMount) actionsMount.appendChild(actionsRow);

    let courseSectionTitle = document.createElement("h3");
    courseSectionTitle.setAttribute(
      "class",
      "schoolPlanner_courses_sectionTitle",
    );
    courseSectionTitle.textContent = "Course information";
    detailsDiv.appendChild(courseSectionTitle);

    courseRows.forEach(([labelText, valueText]) => {
      let row = document.createElement("div");
      row.setAttribute("class", "schoolPlanner_courseDetail_row");

      let label = document.createElement("p");
      label.textContent = labelText;

      let value = document.createElement("p");
      value.textContent = valueText;

      row.append(label, value);
      detailsDiv.appendChild(row);
    });

    let examSectionTitle = document.createElement("h3");
    examSectionTitle.setAttribute(
      "class",
      "schoolPlanner_courses_sectionTitle",
    );
    examSectionTitle.textContent = "Exam information";
    detailsDiv.appendChild(examSectionTitle);

    let examBlock = document.createElement("div");
    examBlock.setAttribute("id", "schoolPlanner_courses_examBlock");

    if (examEntries.length === 0) {
      let emptyExamState = document.createElement("p");
      emptyExamState.setAttribute("id", "schoolPlanner_courses_examEmpty");
      emptyExamState.textContent = "No exam entries.";
      examBlock.appendChild(emptyExamState);
    } else {
      let examList = document.createElement("ul");
      examList.setAttribute("id", "schoolPlanner_courses_exam_ul");

      examEntries.forEach((examEntry) => {
        let examItem = document.createElement("li");
        examItem.setAttribute("class", "schoolPlanner_courses_exam_li");

        const examRows = [
          ["Exam type", examEntry.exam_type || "-"],
          ["Exam date", examEntry.exam_date || "-"],
          ["Exam time", examEntry.exam_time || "-"],
          [
            "Grades",
            `${examEntry.course_grade || "-"} / ${examEntry.course_fullGrade || "-"}`,
          ],
          [
            "Exam due",
            getCourseDueText({
              ...course,
              exam_date: examEntry.exam_date,
              exam_time: examEntry.exam_time,
            }),
          ],
        ];

        examRows.forEach(([labelText, valueText]) => {
          let row = document.createElement("div");
          row.setAttribute(
            "class",
            "schoolPlanner_courseDetail_row schoolPlanner_courseDetail_row_exam",
          );

          let label = document.createElement("p");
          label.textContent = labelText;

          let value = document.createElement("p");
          value.textContent = valueText;

          row.append(label, value);
          examItem.appendChild(row);
        });

        examList.appendChild(examItem);
      });

      examBlock.appendChild(examList);
    }

    detailsDiv.appendChild(examBlock);

    if (
      String(this.props.state?.username || "").toLowerCase() === "naghamtrkmani"
    ) {
      const assignedLetter = this.getNaghamCourseLetter(course);

      if (assignedLetter) {
        let noteBlock = document.createElement("div");
        noteBlock.setAttribute("class", "schoolPlanner_courseLetterBlock");

        let noteText = document.createElement("p");
        noteText.setAttribute("class", "schoolPlanner_courseLetterText");
        noteText.textContent = assignedLetter;

        noteBlock.appendChild(noteText);
        detailsDiv.appendChild(noteBlock);
      }
    }

    this.playCourseDetailsPrintAnimation();
  };

  renderCourseDetailsLoader = () => {
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    let actionsMount = document.getElementById(
      "schoolPlanner_courses_actions_mount",
    );
    if (!detailsDiv) return;

    detailsDiv.classList.remove("schoolPlanner_courses_panel--hidden");
    if (actionsMount) {
      actionsMount.classList.remove("schoolPlanner_courses_panel--hidden");
    }
    detailsDiv.innerHTML = `
      <div id="schoolPlanner_courses_details_loader" class="fc">
        <img src="/img/loader.gif" alt="" width="50px" />
      </div>
    `;
  };

  hideCourseDetailsPanels = () => {
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    let actionsMount = document.getElementById(
      "schoolPlanner_courses_actions_mount",
    );

    this.courseDetailsTypingTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.courseDetailsTypingTimeouts = [];
    this.stopCoursePrintSound();
    if (detailsDiv) {
      detailsDiv.classList.remove("schoolPlanner_courses_panel--printing");
      detailsDiv.classList.add("schoolPlanner_courses_panel--hidden");
      detailsDiv.innerHTML = "";
      detailsDiv.style.transition = "";
      detailsDiv.style.clipPath = "";
      detailsDiv.style.opacity = "";
      detailsDiv.style.filter = "";
    }

    if (actionsMount) {
      actionsMount.classList.remove("schoolPlanner_courses_panel--printing");
      actionsMount.classList.remove("schoolPlanner_courses_panel--hidden");
      actionsMount.innerHTML = `
        <div id="schoolPlanner_courses_actions" class="fr schoolPlanner_courses_actions--idle">
          <button type="button" disabled>Edit</button>
          <button type="button" disabled>Delete</button>
          <button type="button" disabled>Plan</button>
        </div>
      `;
    }
  };

  playCourseDetailsPrintAnimation = () => {
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    let actionsMount = document.getElementById(
      "schoolPlanner_courses_actions_mount",
    );

    if (detailsDiv) {
      detailsDiv.classList.remove("schoolPlanner_courses_panel--hidden");
      detailsDiv.classList.remove("schoolPlanner_courses_panel--printing");
      detailsDiv.scrollTop = 0;
      this.updateCoursePrintReveal(null, true);
    }

    if (actionsMount) {
      actionsMount.classList.remove("schoolPlanner_courses_panel--hidden");
      actionsMount.classList.remove("schoolPlanner_courses_panel--printing");
    }

    let textTargets = [];
    [detailsDiv].forEach((panel) => {
      if (!panel) return;
      panel.querySelectorAll("h3, p, button").forEach((node) => {
        const fullText = node.textContent || "";
        node.dataset.printText = fullText;
        node.textContent = "";
        textTargets.push(node);
      });
    });
    textTargets.sort((a, b) => {
      return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
    });

    let endLineSpacer = null;
    if (detailsDiv) {
      const existingSpacer = detailsDiv.querySelector(
        ".schoolPlanner_courses_printSpacer",
      );
      if (existingSpacer) existingSpacer.remove();

      endLineSpacer = document.createElement("div");
      endLineSpacer.className = "schoolPlanner_courses_printSpacer";
      detailsDiv.append(endLineSpacer);
    }

    const characterDelay = 95;
    const nodeGapDelay = 140;
    const initialDelay = 36;
    const totalChars = textTargets.reduce((count, node) => {
      return count + (node.dataset.printText || "").length;
    }, 0);
    const totalTypingDuration =
      initialDelay +
      totalChars * characterDelay +
      Math.max(0, textTargets.length - 1) * nodeGapDelay;
    let step = 0;
    const printNext = () => {
      if (step >= textTargets.length) {
        this.stopCoursePrintSound();
        if (detailsDiv) {
          this.updateCoursePrintReveal(endLineSpacer || detailsDiv);
          detailsDiv.style.transition =
            "clip-path 130ms ease-out, opacity 100ms linear, filter 120ms linear";
          detailsDiv.style.clipPath = "inset(0 0 0 0)";
          detailsDiv.style.opacity = "1";
          detailsDiv.style.filter = "saturate(1) brightness(1)";
        }
        return;
      }
      const node = textTargets[step];
      const fullText = node.dataset.printText || "";
      let charIndex = 0;

      this.updateCoursePrintReveal(node, step === 0);

      const typeCharacter = () => {
        node.textContent = fullText.slice(0, charIndex + 1);
        this.keepCoursePrintLineVisible(node);
        charIndex += 1;

        if (charIndex < fullText.length) {
          const timeoutId = window.setTimeout(typeCharacter, characterDelay);
          this.courseDetailsTypingTimeouts.push(timeoutId);
        } else {
          step += 1;
          const timeoutId = window.setTimeout(printNext, nodeGapDelay);
          this.courseDetailsTypingTimeouts.push(timeoutId);
        }
      };

      if (fullText.length === 0) {
        step += 1;
        printNext();
        return;
      }

      typeCharacter();
    };

    if (totalChars > 0) {
      this.playCoursePrintSound(totalTypingDuration);
    }
    const timeoutId = window.setTimeout(printNext, initialDelay);
    this.courseDetailsTypingTimeouts.push(timeoutId);
  };

  retrieveLecturesSearched = (searchKeyword) => {
    this.setState({
      lecture_isLoading: true,
    });
    let ul = document.getElementById("schoolPlanner_lectures_ul");
    ul.innerHTML = "";
    let url = apiUrl("/api/user/update/") + this.props.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
    });
    fetch(req)
      .then((response) => {
        if (response.status === 200) {
          this.setState({
            lecture_isLoading: false,
          });
          return response.json();
        }
      })
      .then((jsonData) => {
        var lecture_sorted = jsonData.schoolPlanner.lectures.sort((a, b) =>
          a.lecture_course > b.lecture_course ? -1 : 1,
        );
        var lecture_courses = [];
        lecture_sorted.forEach((lecture) => {
          if (searchKeyword) {
            if (
              String(lecture.lecture_name).includes(searchKeyword) ||
              String(lecture.lecture_course).includes(searchKeyword) ||
              String(lecture.lecture_instructor).includes(searchKeyword) ||
              String(lecture.lecture_outlines).includes(searchKeyword)
            ) {
              let progressionStats = getProgressStats(
                lecture.lecture_progress,
                lecture.lecture_length,
              );
              lecture_courses.push(lecture.lecture_course);
              this.appendLectureRow(ul, lecture, progressionStats, false);
            }
          }
        });
      })
      .then(() => {
        this.calculateLectureNum();
      });
  };
  retrieveLectures = () => {
    this.setState({
      lecture_isLoading: true,
    });
    let ul = document.getElementById("schoolPlanner_lectures_ul");
    ul.innerHTML = "";
    let url = apiUrl("/api/user/update/") + this.props.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
    });
    fetch(req)
      .then((response) => {
        if (response.status === 200) {
          this.setState({
            lecture_isLoading: false,
          });
          return response.json();
        }
      })
      .then((jsonData) => {
        console.log(jsonData.schoolPlanner.lectures);
        var lecture_sorted = jsonData.schoolPlanner.lectures.sort((a, b) =>
          a.lecture_course > b.lecture_course ? -1 : 1,
        );
        var lecture_courses = [];
        lecture_sorted.forEach((lecture) => {
          let progressionStats = getProgressStats(
            lecture.lecture_progress,
            lecture.lecture_length,
          );
          lecture_courses.push(lecture.lecture_course);
          if (lecture.lecture_hidden === false) {
            this.appendLectureRow(ul, lecture, progressionStats, true);
          }
        });
        return {
          lecture_courses: lecture_courses,
          jsonData: jsonData,
        };
      })
      .then((object) => {
        course_pages = [];
        let unique_lecture_courses = [...new Set(object.lecture_courses)];
        unique_lecture_courses.forEach((unique_lecture_course) => {
          let course_length = 0;
          let course_progress = 0;
          object.jsonData.schoolPlanner.lectures.forEach((lecture) => {
            if (
              lecture.lecture_course === unique_lecture_course &&
              lecture.lecture_partOfPlan === true
            ) {
              course_length =
                Number(course_length) + Number(lecture.lecture_length);
              course_progress =
                Number(course_progress) + Number(lecture.lecture_progress);
            }
          });
          course_pages.push({
            course_name: unique_lecture_course,
            course_length: course_length,
            course_progress: course_progress,
          });
        });
        this.calculateLectureNum();
      })
      .catch((err) => {
        if (err.message === "Cannot read property 'credentials' of null")
          console.log("Error", err.message);
      });

    // });
  };

  //.........RETRIEVE COURSES.................
  retrieveCourses = (selectedCourseId) => {
    this.setState({
      course_isLoading: true,
    });
    let courseSelect = document.getElementById("schoolPlanner_courses_select");
    let courseDetails = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    const activeCourseId =
      selectedCourseId || (courseSelect ? courseSelect.value : "");
    if (courseSelect) {
      courseSelect.innerHTML = "";
    }
    if (courseDetails) {
      this.renderCourseDetailsLoader();
    }
    let url = apiUrl("/api/user/update/") + this.props.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
    });
    fetch(req)
      .then((response) => {
        if (response.status === 200) {
          courseNames = [];
          courseInstructorsNames = [];
          courses_partOfPlan = [];
          return response.json();
        }
      })
      .then((jsonData) => {
        courses = jsonData.schoolPlanner.courses;
        if (
          String(this.props.state?.username || "").toLowerCase() ===
          "naghamtrkmani"
        ) {
          const exportedCourses = jsonData.schoolPlanner.courses
            .filter((course) => course?._id && course?.course_name)
            .map((course) => ({
              id: course._id,
              name: course.course_name,
            }));

          window.localStorage.setItem(
            NAGHAM_COURSE_LIST_STORAGE_KEY,
            JSON.stringify(exportedCourses),
          );
        }
        jsonData.schoolPlanner.courses.forEach((course) => {
          if (course.course_name !== "-") courseNames.push(course.course_name);
          course.course_instructors.forEach((instructor) => {
            courseInstructorsNames.push(instructor);
          });

          courseNames_filtered = courseNames.filter((value, index) => {
            return courseNames.indexOf(value) === index;
          });
          courseInstructorsNames_filtered = courseInstructorsNames.filter(
            (value, index) => {
              return courseInstructorsNames.indexOf(value) === index;
            },
          );
          if (course.course_partOfPlan === true) {
            courses_partOfPlan.push(course);
          }
        });

        if (courseSelect) {
          courseSelect.innerHTML =
            "<option selected disabled>Select a course</option>";
          courses.forEach((course) => {
            let option = document.createElement("option");
            option.value = course._id;
            option.textContent = course.course_name;
            courseSelect.append(option);
          });

          if (courses.length > 0) {
            const selectedCourse = courses.find(
              (course) => course._id === activeCourseId,
            );
            if (selectedCourse) {
              courseSelect.value = selectedCourse._id;
              this.renderCourseDetailsCard(selectedCourse);
            } else {
              courseSelect.selectedIndex = 0;
              this.renderCourseDetailsCard(null);
            }
          } else {
            this.renderCourseDetailsCard(null);
          }

          courseSelect.onchange = (event) => {
            const selectedCourse = courses.find(
              (course) => course._id === event.target.value,
            );
            this.renderCourseDetailsCard(selectedCourse);
          };
        }
      })
      .then(() => {
        this.setState({
          course_isLoading: false,
        });
        console.log(courses_partOfPlan);
        //....TO ADD COURSE NAMES OPTIONS TO SELECT COURSE IN LECTURE ADD FORM
        var select_courseNames = document.getElementById(
          "schoolPlanner_addLecture_course_input",
        );
        select_courseNames.innerHTML =
          " <option selected disabled>Lecture course</option>";
        for (var i = 0; i < courseNames_filtered.length; i++) {
          let option = document.createElement("option");
          option.innerHTML = courseNames_filtered[i];
          select_courseNames.append(option);
        }
        var select_courseInstructorsNames = document.getElementById(
          "schoolPlanner_addLecture_instructorName_input",
        );
        select_courseInstructorsNames.innerHTML =
          " <option selected disabled>Lecture instructor name</option>";
        for (var i = 0; i < courseInstructorsNames_filtered.length; i++) {
          let option = document.createElement("option");
          option.innerHTML = courseInstructorsNames_filtered[i];
          select_courseInstructorsNames.append(option);
        }
      })
      .catch(() => {
        this.setState({
          course_isLoading: false,
        });
        this.renderCourseDetailsCard(null);
      });
  };
  //.............................................

  deleteLecture = async () => {
    //......DELETEING item FROM itemS DB
    for (var i = 0; i < checkedLectures.length; i++) {
      console.log(checkedLectures[i]);
      let url =
        apiUrl("/api/user/deleteLecture/") +
        this.props.state.my_id +
        "/" +
        checkedLectures[i];
      let options = {
        method: "DELETE",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.props.state.token,
          "Content-Type": "application/json",
        },
      };
      let req = new Request(url, options);
      await fetch(req).then((result) => {
        if (result.status === 201) {
          document.getElementById(checkedLectures[i] + "menuLi_div").remove();
        }
      });
    }

    checkedLectures = [];
  };

  //.............DELETE COURSE.....................
  deleteCourse = async () => {
    alert("afsd");
    if (checkedCourses.length === 0) {
      const courseSelect = document.getElementById(
        "schoolPlanner_courses_select",
      );
      if (courseSelect && courseSelect.value) {
        checkedCourses = [courseSelect.value];
      }
    }

    //......DELETEING item FROM itemS DB
    for (var i = 0; i < checkedCourses.length; i++) {
      let url =
        apiUrl("/api/user/deleteCourse/") +
        this.props.state.my_id +
        "/" +
        checkedCourses[i];
      let options = {
        method: "DELETE",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.props.state.token,
          "Content-Type": "application/json",
        },
      };
      let req = new Request(url, options);
      await fetch(req).then((result) => {
        if (result.status === 201) {
          this.retrieveCourses();
        }
      });
    }

    checkedCourses = [];
  };
  deleteCourseById = async (courseId) => {
    let url =
      apiUrl("/api/user/deleteCourse/") +
      this.props.state.my_id +
      "/" +
      courseId;
    let options = {
      method: "DELETE",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    await fetch(req).then((result) => {
      if (result.status === 201) {
        this.retrieveCourses();
      }
    });
  };
  //...............................................
  //..............EDIT COURSE....................
  editCourse = (object) => {
    const primaryExam = getPrimaryCourseExam(courseExams);
    document.getElementById("schoolPlanner_addCourse_div").style.display =
      "none";
    let url =
      apiUrl("/api/user/editCourse/") +
      this.props.state.my_id +
      "/" +
      target_editCourse;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course_name: object.course_name,
        course_component: object.course_component,
        course_dayAndTime: courseDayAndTime,
        course_term: object.course_term,
        course_year: object.course_year,
        course_class: object.course_class,
        course_status: object.course_status,
        course_instructors: courseInstructorsNames,
        course_grade: primaryExam.course_grade,
        course_fullGrade: primaryExam.course_fullGrade,
        course_length: object.course_length,
        course_progress: object.course_progress,
        course_partOfPlan: false,
        course_exams: courseExams,
        exam_type: primaryExam.exam_type,
        exam_date: primaryExam.exam_date,
        exam_time: primaryExam.exam_time,
      }),
    };
    let req = new Request(url, options);
    fetch(req).then((result) => {
      if (result.status === 201) {
        this.retrieveLectures();
        this.retrieveCourses();
      }
    });
  };
  //..............PartofPlan COURSE....................
  partOfPlanCourse = (object, partOfPlanID, boolean) => {
    const storedCourseExams = object.course_exams || [];
    const primaryExam = getPrimaryCourseExam(storedCourseExams);
    document.getElementById("schoolPlanner_addCourse_div").style.display =
      "none";
    let url =
      apiUrl("/api/user/editCourse/") +
      this.props.state.my_id +
      "/" +
      target_editCourse;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course_name: object.course_name,
        course_component: object.course_component,
        course_dayAndTime: object.course_component,
        course_term: object.course_term,
        course_year: object.course_year,
        course_class: object.course_class,
        course_status: object.course_status,
        course_instructors: object.course_instructors,
        course_grade: primaryExam.course_grade || object.course_grade,
        course_fullGrade:
          primaryExam.course_fullGrade || object.course_fullGrade,
        course_length: object.course_length,
        course_progress: object.course_progress,
        course_partOfPlan: boolean,
        course_exams: storedCourseExams,
        exam_type: primaryExam.exam_type || object.exam_type,
        exam_date: primaryExam.exam_date || object.exam_date,
        exam_time: primaryExam.exam_time || object.exam_time,
      }),
    };
    let req = new Request(url, options);
    fetch(req).then((result) => {
      if (result.status === 201) {
        this.retrieveLectures();
        this.retrieveCourses();
      }
    });
  };
  //...............................................
  //..............EDIT COURSE....................
  editCoursePages = async () => {
    this.setState({
      course_isLoading: true,
    });
    for (var i = 0; i < course_pages.length; i++) {
      let url =
        apiUrl("/api/user/editCoursePages/") +
        this.props.state.my_id +
        "/" +
        course_pages[i].course_name;
      let options = {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_length: course_pages[i].course_length,
          course_progress: course_pages[i].course_progress,
        }),
      };
      let req = new Request(url, options);
      await fetch(req).then((result) => {
        if (result.status === 201) {
          this.setState({
            course_isLoading: false,
          });
          if (i === course_pages.length - 1) this.retrieveCourses();
        }
      });
    }
  };
  //...............................................

  //......................................

  //......................................

  //........................EDIT item......................
  editLecture = (object) => {
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/editLecture/") +
      this.props.state.my_id +
      "/" +
      object._id;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(object),
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        const selectedCourseId = document.getElementById(
          "schoolPlanner_courses_select",
        )?.value;
        this.setState({
          lecture_isLoading: false,
        });
        lectureInEdit = {};
        document.getElementById("schoolPlanner_addLecture_div").style.display =
          "none";
        this.retrieveLectures();
        this.retrieveCourses(selectedCourseId);
      }
    });
  };
  //..............EDIT COURSE PAGES............
  //........................ADD item.......................
  addLecture = (object) => {
    if (!object.lecture_name) object.lecture_name = "-";
    if (object.lecture_course === "Lecture course") object.lecture_course = "-";
    if (object.lecture_instructor === "Lecture instructor name")
      object.lecture_instructor = "-";
    if (!object.lecture_writer) object.lecture_writer = "-";
    if (!object.lecture_date) object.lecture_date = "-";
    if (!object.lecture_length) object.lecture_length = 0;
    if (!object.lecture_progress) object.lecture_progress = 0;
    let url = apiUrl("/api/user/addLecture/") + this.props.state.my_id;
    let options = {
      method: "POST",
      mode: "cors",
      body: JSON.stringify(object),
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        const selectedCourseId = document.getElementById(
          "schoolPlanner_courses_select",
        )?.value;
        document.getElementById("schoolPlanner_addLecture_div").style.display =
          "none";
        this.retrieveLectures();
        this.retrieveCourses(selectedCourseId);
      }
    });
  };

  //.........ADD COURSE............
  addCourse = (object) => {
    const primaryExam = getPrimaryCourseExam(courseExams);
    if (object.course_name) {
      if (object.course_component === "Course component")
        object.course_component = "-";
      if (object.course_year === "Course year") object.course_year = "-";
      if (object.course_term === "Course term") object.course_term = "-";
      if (object.course_class === "Course classification")
        object.course_class = "-";
      if (object.course_status === "Course status") object.course_status = "-";
      if (object.exam_type === "Exam type") object.exam_type = "-";

      let url = apiUrl("/api/user/addCourse/") + this.props.state.my_id;
      let options = {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.props.state.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_name: object.course_name,
          course_component: object.course_component,
          course_dayAndTime: courseDayAndTime,
          course_year: object.course_year,
          course_term: object.course_term,
          course_class: object.course_class,
          course_status: object.course_status,
          course_instructors: courseInstructorsNames,
          course_grade: primaryExam.course_grade,
          course_fullGrade: primaryExam.course_fullGrade,
          course_length: 0,
          course_progress: 0,
          course_exams: courseExams,
          exam_type: primaryExam.exam_type,
          exam_date: primaryExam.exam_date,
          exam_time: primaryExam.exam_time,
        }),
      };
      let req = new Request(url, options);
      fetch(req).then((course) => {
        if (course.status === 201) {
          document.getElementById("schoolPlanner_addCourse_div").style.display =
            "none";
          this.retrieveCourses();
        }
      });
    } else {
      this.props.serverReply("Posting failed. Please add course name");
    }
  };
  render() {
    return (
      <React.Fragment>
        <article id="schoolPlanner_article" className="fr">
          <div className="fr" id="schoolPlanner_coursesLectures_wrapper">
            <aside id="schoolPlanner_courses_aside" className="fc">
              <div id="schoolPlanner_courses_headerBlock" className="fc">
                <div id="schoolPlanner_courses_nav" className="fr">
                  <p>Courses</p>
                  <button
                    type="button"
                    aria-label="Add course"
                    title="Add course"
                    onClick={() =>
                      this.openAddCourseForm({
                        buttonName: "Add",
                      })
                    }
                  >
                    <i className="fi fi-rr-plus"></i>
                  </button>
                </div>
              </div>
              <div id="schoolPlanner_courses_panelWrapper" className="fc">
                <div id="schoolPlanner_courses_select_shell">
                  <select id="schoolPlanner_courses_select"></select>
                </div>
                <div
                  id="schoolPlanner_courses_details_div"
                  className="fc schoolPlanner_courses_panel--hidden"
                ></div>
                <div
                  id="schoolPlanner_courses_actions_mount"
                  className="fc schoolPlanner_courses_panel--hidden"
                ></div>
              </div>
              {}
            </aside>
            <div id="schoolPlanner_musicColumn" className="fc">
              <div
                id="schoolPlanner_musicColumn_panel"
                className={`schoolPlanner_stripMonogram${this.state.music_isPlaying ? " schoolPlanner_musicColumn_panel--playing" : ""}`}
              >
                <p id="schoolPlanner_musicColumn_title">Music</p>
                <button
                  id="schoolPlanner_musicColumn_prev"
                  className="schoolPlanner_musicColumn_skip"
                  type="button"
                  aria-label="Previous track"
                  title="Previous track"
                  onClick={() =>
                    this.playPreviousPlannerMusicTrack(
                      this.state.music_isPlaying,
                    )
                  }
                >
                  <i className="fi fi-rr-angle-small-up"></i>
                </button>
                <button
                  id="schoolPlanner_musicColumn_toggle"
                  type="button"
                  aria-label={
                    this.state.music_isPlaying ? "Pause music" : "Play music"
                  }
                  onClick={this.togglePlannerMusic}
                >
                  <i
                    className={
                      this.state.music_isPlaying
                        ? "fi fi-rr-pause"
                        : "fi fi-rr-play"
                    }
                  ></i>
                </button>
                <button
                  id="schoolPlanner_musicColumn_next"
                  className="schoolPlanner_musicColumn_skip"
                  type="button"
                  aria-label="Next track"
                  title="Next track"
                  onClick={() =>
                    this.playNextPlannerMusicTrack(this.state.music_isPlaying)
                  }
                >
                  <i className="fi fi-rr-angle-small-down"></i>
                </button>
                <div
                  id="schoolPlanner_musicColumn_bars"
                  className={
                    this.state.music_isPlaying
                      ? "schoolPlanner_musicColumn_bars--playing"
                      : ""
                  }
                  aria-hidden="true"
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div id="schoolPlanner_musicColumn_volumeShell">
                  <input
                    id="schoolPlanner_musicColumn_volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={this.state.music_volume}
                    onChange={this.updatePlannerMusicVolume}
                    aria-label="Music volume"
                  />
                </div>
                <p
                  id="schoolPlanner_musicColumn_track"
                  title={`${this.state.music_trackTitle} - ${this.state.music_trackArtist}`}
                >
                  {this.state.music_isLoading
                    ? "Loading Archive"
                    : this.state.music_trackTitle}
                </p>
              </div>
              <audio
                ref={this.musicAudioRef}
                onPlay={() => this.setState({ music_isPlaying: true })}
                onPause={() => this.setState({ music_isPlaying: false })}
                onEnded={() => this.playNextPlannerMusicTrack(true)}
                onError={() => this.playNextPlannerMusicTrack(false)}
              />
            </div>
            <section id="schoolPlanner_lectures_section">
              {this.state.lecture_isLoading === true && (
                <div id="lecture_loaderImg" className="loaderImg_div fc">
                  <img src="/img/loader.gif" alt="" width="50px" />
                </div>
              )}
              <nav id="schoolPlanner_lectures_nav" className="fr">
                <button
                  onClick={() =>
                    this.openAddLectureForm({
                      buttonName: "Add",
                    })
                  }
                >
                  Add
                </button>
                <button onClick={() => this.deleteLecture(checkedLectures)}>
                  Delete
                </button>
                <button
                  id="schoolPlanner_lectures_hideUnchecked_button"
                  onClick={() => this.hideUncheckedLectures()}
                >
                  Prioritize
                </button>
                <button
                  id="schoolPlanner_lectures_unhideUnchecked_button"
                  onClick={() => this.unhideUncheckedLectures()}
                >
                  Show all
                </button>
                <div id="schoolPlanner_lectures_search_div" className="fr">
                  <input
                    placeholder="search"
                    id="schoolPlanner_lectures_search_input"
                    onKeyUp={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        this.retrieveLecturesSearched(
                          document.getElementById(
                            "schoolPlanner_lectures_search_input",
                          ).value,
                        );
                      }
                    }}
                    onChange={() => {
                      if (
                        document.getElementById(
                          "schoolPlanner_lectures_search_input",
                        ).value === ""
                      )
                        this.retrieveLectures();
                    }}
                  />
                  <button
                    id="schoolPlanner_lectures_search_button"
                    onClick={() => {
                      this.retrieveLecturesSearched(
                        document.getElementById(
                          "schoolPlanner_lectures_search_input",
                        ).value,
                      );
                    }}
                  >
                    <i className="fi fi-rr-search"></i>
                  </button>
                </div>
              </nav>
              <div id="schoolPlanner_lectures_tableShell">
                <table id="schoolPlanner_lectures_table">
                  <thead id="schoolPlanner_lectures_tableLabels_section">
                    <tr id="schoolPlanner_lectures_tableLabels_div">
                      <th>Title</th>
                      <th>Course</th>
                      <th>Instructor name</th>
                      <th>Writer name</th>
                      <th>Progression</th>
                    </tr>
                  </thead>
                  <tbody id="schoolPlanner_lectures_ul"></tbody>
                </table>
              </div>
            </section>
          </div>
          <div id="schoolPlanner_planDoor_div" className="fc">
            <button
              type="button"
              className="schoolPlanner_stripMonogram"
              aria-label="Toggle plan"
              onClick={() => {
                let schoolPlanner_plan_aside = document.getElementById(
                  "schoolPlanner_plan_aside",
                );
                let schoolPlanner_coursesLectures_wrapper =
                  document.getElementById(
                    "schoolPlanner_coursesLectures_wrapper",
                  );
                let schoolPlanner_plan_aside_width = getComputedStyle(
                  schoolPlanner_plan_aside,
                ).width;
                if (schoolPlanner_plan_aside_width === "0px") {
                  schoolPlanner_coursesLectures_wrapper.style.width = "0";
                  schoolPlanner_plan_aside.style.width = "100vw";
                  //..........
                  let schoolPlanner_plan_days_wrapper = document.getElementById(
                    "schoolPlanner_plan_days_list",
                  );
                  schoolPlanner_plan_days_wrapper.innerHTML = "";
                  let coursesDays = [];
                  courses_partOfPlan.forEach((course) => {
                    var examDateinMillisec = new Date(course.exam_date);
                    var diffDaysWithDecimals =
                      (examDateinMillisec - todayDate) / 86400000;
                    var diffDaysWithoutDecimals =
                      Math.floor(diffDaysWithDecimals);
                    coursesDays.push(diffDaysWithoutDecimals);
                  });
                  let highestNum = coursesDays.sort().reverse()[0];
                  for (var i = 0; i < highestNum; i++) {
                    let p_dayNum = document.createElement("p");
                    p_dayNum.setAttribute("class", "plan_p_dayNum");
                    if (i == 0) p_dayNum.textContent = "Today";
                    if (i == 1) p_dayNum.textContent = "Tomorrow";
                    if (i == 2) p_dayNum.textContent = "The day after tomorrow";
                    if (i > 2) p_dayNum.textContent = "Day " + Number(i + 1);
                    let div_day = document.createElement("div");
                    div_day.setAttribute(
                      "class",
                      "schoolPlanner_plan_days_div",
                    );
                    div_day.append(p_dayNum);
                    schoolPlanner_plan_days_wrapper.append(div_day);
                  }
                  courses_partOfPlan.forEach((course) => {
                    var examDateinMillisec = new Date(course.exam_date);
                    var diffDaysWithDecimals =
                      (examDateinMillisec - todayDate) / 86400000;
                    var diffDaysWithoutDecimals =
                      Math.floor(diffDaysWithDecimals);
                    for (var j = 0; j < diffDaysWithoutDecimals; j++) {
                      let pageNum = getSafePagesPerDay(
                        course.course_length,
                        course.course_progress,
                        diffDaysWithoutDecimals,
                      );
                      let p_courseName = document.createElement("p");
                      let p_coursePagesPerDay = document.createElement("p");
                      let div_course = document.createElement("div");
                      div_course.setAttribute("class", "fr plan_div_course");
                      p_courseName.textContent = course.course_name;
                      if (pageNum !== 0)
                        p_coursePagesPerDay.textContent = pageNum + " page";
                      if (pageNum == 0)
                        p_coursePagesPerDay.textContent = "Done";
                      div_course.append(p_courseName, p_coursePagesPerDay);
                      schoolPlanner_plan_days_wrapper.children[j].append(
                        div_course,
                      );
                    }
                  });
                  let totalPagesInDays = [];
                  for (
                    var i = 0;
                    i < schoolPlanner_plan_days_wrapper.children.length;
                    i++
                  ) {
                    let totalPagesPerDay = 0;
                    for (
                      var j = 1;
                      j <
                      schoolPlanner_plan_days_wrapper.children[i].children
                        .length;
                      j++
                    ) {
                      var str =
                        schoolPlanner_plan_days_wrapper.children[i].children[j]
                          .children[1].textContent;
                      var matches = str.match(/(\d+)/);
                      if (matches) {
                        totalPagesPerDay += Number(matches[0]);
                      }
                    }
                    let p_total = document.createElement("p");
                    p_total.textContent = "Total pages: " + totalPagesPerDay;
                    p_total.setAttribute("class", "plan_p_total");
                    schoolPlanner_plan_days_wrapper.children[i].append(p_total);
                  }
                  //...........
                } else {
                  schoolPlanner_coursesLectures_wrapper.style.width = "100%";
                  schoolPlanner_plan_aside.style.width = "0";
                }
              }}
            >
              N
            </button>
          </div>
          <aside
            id="schoolPlanner_plan_aside"
            style={{ width: "0px" }}
            className="fc"
          >
            <div id="schoolPlanner_plan_wrapper" className="fc">
              <div id="schoolPlanner_plan_days_wrapper" className="fc">
                <ul id="schoolPlanner_plan_days_list"></ul>
                <div id="schoolPlanner_plan_telegramShell">
                  <div id="schoolPlanner_plan_telegramControl" className="fc">
                    <p id="schoolPlanner_plan_telegramControlTitle">
                      Telegram Control
                    </p>
                    <label
                      htmlFor="schoolPlanner_plan_telegramInput"
                      className="schoolPlanner_plan_telegramControlLabel"
                    >
                      Group reference
                    </label>
                    <input
                      id="schoolPlanner_plan_telegramInput"
                      type="text"
                      value={this.state.telegram_groupInput}
                      onChange={this.updateTelegramGroupInput}
                      placeholder="@groupname or chat link"
                    />
                    <button
                      id="schoolPlanner_plan_telegramSave"
                      type="button"
                      onClick={this.saveTelegramConfig}
                      disabled={this.state.telegram_isSaving}
                    >
                      {this.state.telegram_isSaving ? "Saving..." : "Save"}
                    </button>
                    <p className="schoolPlanner_plan_telegramControlHint">
                      Use the Telegram username or link for the group you want
                      to sync here.
                    </p>
                    {this.state.telegram_feedback ? (
                      <p className="schoolPlanner_plan_telegramControlFeedback">
                        {this.state.telegram_feedback}
                      </p>
                    ) : null}
                  </div>
                  <div id="schoolPlanner_plan_telegramPanel" className="fc">
                    <div id="schoolPlanner_plan_telegramHeader" className="fr">
                      <p>{this.state.telegram_groupTitle}</p>
                      <div
                        id="schoolPlanner_plan_telegramButtons"
                        className="fr"
                      >
                        <button
                          id="schoolPlanner_plan_telegramRefresh"
                          type="button"
                          onClick={this.fetchTelegramGroupMessages}
                          title="Refresh Telegram messages"
                          aria-label="Refresh Telegram messages"
                        >
                          <i className="fi fi-rr-rotate-right"></i>
                        </button>
                      </div>
                    </div>
                    <div id="schoolPlanner_plan_telegramBody" className="fc">
                      {this.state.telegram_isLoading ? (
                        <p className="schoolPlanner_plan_telegramStatus">
                          Loading Telegram messages...
                        </p>
                      ) : this.state.telegram_error ? (
                        <p className="schoolPlanner_plan_telegramStatus">
                          {this.state.telegram_error}
                        </p>
                      ) : this.state.telegram_messages.length === 0 ? (
                        <p className="schoolPlanner_plan_telegramStatus">
                          No Telegram messages found yet.
                        </p>
                      ) : (
                        <>
                          {this.groupTelegramMessagesByDay(
                            this.state.telegram_messages,
                          ).map((messageGroup) => (
                            <div
                              key={messageGroup.dayLabel}
                              className="schoolPlanner_plan_telegramDayGroup fc"
                            >
                              <p className="schoolPlanner_plan_telegramDayLabel">
                                {messageGroup.dayLabel}
                              </p>
                              {messageGroup.items.map((message) => (
                                <div
                                  key={
                                    message.id ||
                                    `${message.sender}-${message.date}`
                                  }
                                  className="schoolPlanner_plan_telegramMessage fc"
                                >
                                  <div className="fr schoolPlanner_plan_telegramMeta">
                                    <span>{message.sender || "Unknown"}</span>
                                    <span>
                                      {this.formatTelegramDateTime(
                                        message.date,
                                      )}
                                    </span>
                                  </div>
                                  <p>{message.text || "[No text]"}</p>
                                </div>
                              ))}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    {this.state.telegram_hasMore &&
                    !this.state.telegram_isLoading &&
                    !this.state.telegram_error ? (
                      <button
                        id="schoolPlanner_plan_telegramLoadMore"
                        type="button"
                        onClick={this.loadMoreTelegramMessages}
                      >
                        Load more
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </aside>
          <div id="schoolPlanner_addLecture_div" className="fc">
            <label onClick={this.closeAddLectureForm}>Close</label>
            <form id="schoolPlanner_addLecture_form" className="fc">
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowWide">
                <input
                  id="schoolPlanner_addLecture_name_input"
                  placeholder="Lecture name"
                />
              </div>
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowSplit">
                <select id="schoolPlanner_addLecture_course_input">
                  <option selected disabled>
                    Lecture course
                  </option>
                </select>
                <select id="schoolPlanner_addLecture_instructorName_input">
                  <option selected disabled>
                    Lecture instructor name
                  </option>
                </select>
              </div>
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowSplit">
                <input
                  id="schoolPlanner_addLecture_writerName_input"
                  placeholder="Lecture writer name"
                />
                <input id="schoolPlanner_addLecture_date_input" type="date" />
              </div>
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowNarrow">
                <input
                  id="schoolPlanner_addLecture_length_input"
                  placeholder="Lecture length"
                />
              </div>
              <div id="schoolPlanner_addLecture_outlines_div" className="fr">
                <div className="fc">
                  <textarea
                    id="schoolPlanner_addLecture_outlines_input"
                    placeholder="Lecture outline"
                  />
                  <ul
                    id="schoolPlanner_addLecture_outlines_ul"
                    className="fr"
                  ></ul>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    this.addLectureOutline();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      this.addLectureOutline();
                    }
                  }}
                >
                  add
                </div>
              </div>
            </form>
            <label
              id="schoolPlanner_addLecture_addButton_label"
              onClick={() => {
                let buttonName = document.getElementById(
                  "schoolPlanner_addLecture_addButton_label",
                ).textContent;
                let lecture_name = document.getElementById(
                  "schoolPlanner_addLecture_name_input",
                ).value;
                let lecture_course = document.getElementById(
                  "schoolPlanner_addLecture_course_input",
                ).value;
                let lecture_instructor = document.getElementById(
                  "schoolPlanner_addLecture_instructorName_input",
                ).value;
                let lecture_writer = document.getElementById(
                  "schoolPlanner_addLecture_writerName_input",
                ).value;
                let lecture_date = document.getElementById(
                  "schoolPlanner_addLecture_date_input",
                ).value;
                let lecture_length = document.getElementById(
                  "schoolPlanner_addLecture_length_input",
                ).value;

                if (buttonName === "Add") {
                  this.addLecture({
                    lecture_name: lecture_name,
                    lecture_course: lecture_course,
                    lecture_instructor: lecture_instructor,
                    lecture_writer: lecture_writer,
                    lecture_date: lecture_date,
                    lecture_length: lecture_length,
                    lecture_progress: {},
                    lecture_pagesFinished: [],
                    lecture_outlines: [],
                    lecture_partOfPlan: true,
                    lecture_hidden: false,
                  });
                }
                if (buttonName === "Edit") {
                  this.editLecture({
                    _id: selectedLecture,
                    lecture_name: lecture_name,
                    lecture_course: lecture_course,
                    lecture_instructor: lecture_instructor,
                    lecture_writer: lecture_writer,
                    lecture_date: lecture_date,
                    lecture_length: lecture_length,
                    lecture_progress: lectureInEdit.lecture_progress,
                    lecture_pagesFinished: lectureInEdit.lecture_pagesFinished,
                    lecture_outlines: lectureOutlines,
                    lecture_partOfPlan: lectureInEdit.lecture_partOfPlan,
                    lecture_hidden: lectureInEdit.lecture_hidden,
                  });
                }
              }}
            >
              Add
            </label>
          </div>
          <div id="schoolPlanner_addCourse_div" className="fc">
            <div
              id="schoolPlanner_addCourse_closeButton"
              role="button"
              tabIndex={0}
              onClick={this.closeAddCourseForm}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  this.closeAddCourseForm();
                }
              }}
            >
              Close
            </div>
            <div id="schoolPlanner_addCourse_scrollArea" className="fc">
              <form id="schoolPlanner_addCourse_form" className="fc">
                <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowSplit">
                  <input
                    id="schoolPlanner_addCourse_name_input"
                    placeholder="Course name"
                  />
                  <select id="schoolPlanner_addCourse_component_input">
                    <option selected={true} disabled="disabled">
                      Course component
                    </option>
                    <option>In-class</option>
                    <option>Out-of-class</option>
                  </select>
                </div>
                <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowWide">
                  <div
                    id="schoolPlanner_addCourse_dayAndTime_div"
                    className="fr"
                  >
                    <section
                      id="schoolPlanner_addCourse_dayAndTime_input_section"
                      className="fc"
                    >
                      <div className="fc">
                        <select id="schoolPlanner_addCourse_day_input">
                          <option selected={true} disabled="disabled">
                            Course day
                          </option>
                          <option>Sunday</option>
                          <option>Monday</option>
                          <option>Tuesday</option>
                          <option>Wednesday</option>
                          <option>Thursday</option>
                          <option>Friday</option>
                          <option>Saturday</option>
                        </select>
                        <div
                          id="schoolPlanner_addCourse_time_inputs"
                          className="fr"
                        >
                          <input
                            placeholder="hh"
                            id="schoolPlanner_addCourse_time_hour_input"
                          />
                          <input
                            placeholder="mm"
                            id="schoolPlanner_addCourse_time_minute_input"
                          />
                        </div>
                      </div>
                    </section>
                    <ul
                      id="schoolPlanner_addCourse_dayAndTime_ul"
                      className="fr"
                    ></ul>
                    <div id="schoolPlanner_addCourse_dayAndTime_label">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          this.addCourseDayAndTime({
                            day: document.getElementById(
                              "schoolPlanner_addCourse_day_input",
                            ).value,
                            time: buildExamTimeValue({
                              hour: document.getElementById(
                                "schoolPlanner_addCourse_time_hour_input",
                              ).value,
                              minute: document.getElementById(
                                "schoolPlanner_addCourse_time_minute_input",
                              ).value,
                            }),
                          });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            this.addCourseDayAndTime({
                              day: document.getElementById(
                                "schoolPlanner_addCourse_day_input",
                              ).value,
                              time: buildExamTimeValue({
                                hour: document.getElementById(
                                  "schoolPlanner_addCourse_time_hour_input",
                                ).value,
                                minute: document.getElementById(
                                  "schoolPlanner_addCourse_time_minute_input",
                                ).value,
                              }),
                            });
                          }
                        }}
                      >
                        add
                      </div>
                    </div>
                  </div>
                </div>
                <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowQuad">
                  <select
                    class="form-select"
                    name="year"
                    id="schoolPlanner_addCourse_year_input"
                  >
                    <option selected={true} disabled="disabled">
                      Course year
                    </option>
                    <option value="1940">1940</option>
                    <option value="1941">1941</option>
                    <option value="1942">1942</option>
                    <option value="1943">1943</option>
                    <option value="1944">1944</option>
                    <option value="1945">1945</option>
                    <option value="1946">1946</option>
                    <option value="1947">1947</option>
                    <option value="1948">1948</option>
                    <option value="1949">1949</option>
                    <option value="1950">1950</option>
                    <option value="1951">1951</option>
                    <option value="1952">1952</option>
                    <option value="1953">1953</option>
                    <option value="1954">1954</option>
                    <option value="1955">1955</option>
                    <option value="1956">1956</option>
                    <option value="1957">1957</option>
                    <option value="1958">1958</option>
                    <option value="1959">1959</option>
                    <option value="1960">1960</option>
                    <option value="1961">1961</option>
                    <option value="1962">1962</option>
                    <option value="1963">1963</option>
                    <option value="1964">1964</option>
                    <option value="1965">1965</option>
                    <option value="1966">1966</option>
                    <option value="1967">1967</option>
                    <option value="1968">1968</option>
                    <option value="1969">1969</option>
                    <option value="1970">1970</option>
                    <option value="1971">1971</option>
                    <option value="1972">1972</option>
                    <option value="1973">1973</option>
                    <option value="1974">1974</option>
                    <option value="1975">1975</option>
                    <option value="1976">1976</option>
                    <option value="1977">1977</option>
                    <option value="1978">1978</option>
                    <option value="1979">1979</option>
                    <option value="1980">1980</option>
                    <option value="1981">1981</option>
                    <option value="1982">1982</option>
                    <option value="1983">1983</option>
                    <option value="1984">1984</option>
                    <option value="1985">1985</option>
                    <option value="1986">1986</option>
                    <option value="1987">1987</option>
                    <option value="1988">1988</option>
                    <option value="1989">1989</option>
                    <option value="1990">1990</option>
                    <option value="1991">1991</option>
                    <option value="1992">1992</option>
                    <option value="1993">1993</option>
                    <option value="1994">1994</option>
                    <option value="1995">1995</option>
                    <option value="1996">1996</option>
                    <option value="1997">1997</option>
                    <option value="1998">1998</option>
                    <option value="1999">1999</option>
                    <option value="2000">2000</option>
                    <option value="2001">2001</option>
                    <option value="2002">2002</option>
                    <option value="2003">2003</option>
                    <option value="2004">2004</option>
                    <option value="2005">2005</option>
                    <option value="2006">2006</option>
                    <option value="2007">2007</option>
                    <option value="2008">2008</option>
                    <option value="2009">2009</option>
                    <option value="2010">2010</option>
                    <option value="2011">2011</option>
                    <option value="2012">2012</option>
                    <option value="2013">2013</option>
                    <option value="2014">2014</option>
                    <option value="2015">2015</option>
                    <option value="2016">2016</option>
                    <option value="2017">2017</option>
                    <option value="2018">2018</option>
                    <option value="2019">2019</option>
                    <option value="2020">2020</option>
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                  </select>
                  <select name="" id="schoolPlanner_addCourse_term_input">
                    <option selected={true} disabled="disabled">
                      Course term
                    </option>
                    <option>Fall</option>
                    <option>Winter</option>
                    <option>Summer</option>
                  </select>
                  <select id="schoolPlanner_addCourse_class_input">
                    <option selected={true} disabled="disabled">
                      Course classification
                    </option>
                    <option disabled="disabled">IN-CLASS</option>
                    <option>Basic science</option>
                    <option>Applied science</option>
                    <option disabled="disabled">OUT-OF-CLASS</option>
                    <option>Lab</option>
                    <option>Clinical rotation</option>
                  </select>
                  <select name="" id="schoolPlanner_addCourse_status_input">
                    <option selected={true} disabled="disabled">
                      Course status
                    </option>
                    <option>Unstarted</option>
                    <option>Ongoing</option>
                    <option>Pass</option>
                    <option>Fail</option>
                  </select>
                </div>
                <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowWide">
                  <div
                    id="schoolPlanner_addCourse_instructorsNames_div"
                    className="fr"
                  >
                    <div
                      id="schoolPlanner_addCourse_instructorName_section"
                      className="fr"
                    >
                      <input
                        id="schoolPlanner_addCourse_instructorName_input"
                        placeholder="Course instructors"
                      />
                      <ul
                        id="schoolPlanner_addCourse_instructorsNames_ul"
                        className="fr"
                      ></ul>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        this.addCourseInstructorsNames();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          this.addCourseInstructorsNames();
                        }
                      }}
                    >
                      add
                    </div>
                  </div>
                </div>
                <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowWide schoolPlanner_addCourse_rowMeta">
                  <div id="schoolPlanner_addCourse_examSection" className="fc">
                    <div id="schoolPlanner_addCourse_exam_div" className="fr">
                      <section
                        id="schoolPlanner_addCourse_exam_input_section"
                        className="fc"
                      >
                        <div
                          id="schoolPlanner_addCourse_exam_input_section_inner"
                          className="fc"
                        >
                          <label
                            htmlFor="schoolPlanner_addCourse_examDate_day_input"
                            className="schoolPlanner_addCourse_examFieldLabel"
                          >
                            Exam date
                          </label>
                          <div
                            id="schoolPlanner_addCourse_examDate_inputs"
                            className="fr"
                          >
                            <input
                              placeholder="DD"
                              id="schoolPlanner_addCourse_examDate_day_input"
                            />
                            <input
                              placeholder="MM"
                              id="schoolPlanner_addCourse_examDate_month_input"
                            />
                            <input
                              placeholder="YYYY"
                              id="schoolPlanner_addCourse_examDate_year_input"
                            />
                          </div>
                          <label
                            htmlFor="schoolPlanner_addCourse_examTime_hour_input"
                            className="schoolPlanner_addCourse_examFieldLabel"
                          >
                            Exam time
                          </label>
                          <div
                            id="schoolPlanner_addCourse_examTime_inputs"
                            className="fr"
                          >
                            <input
                              placeholder="hh"
                              id="schoolPlanner_addCourse_examTime_hour_input"
                            />
                            <input
                              placeholder="mm"
                              id="schoolPlanner_addCourse_examTime_minute_input"
                            />
                          </div>
                          <label
                            htmlFor="schoolPlanner_addCourse_examType_input"
                            className="schoolPlanner_addCourse_examFieldLabel"
                          >
                            Exam type
                          </label>
                          <select id="schoolPlanner_addCourse_examType_input">
                            <option selected={true} disabled="disabled">
                              Exam type
                            </option>
                            <option>Quiz</option>
                            <option>Midterm</option>
                            <option>Final</option>
                            <option>Practical</option>
                            <option>Oral</option>
                          </select>
                          <label
                            htmlFor="schoolPlanner_addCourse_grade_input"
                            className="schoolPlanner_addCourse_examFieldLabel"
                          >
                            Grades
                          </label>
                          <div
                            id="schoolPlanner_addCourse_grade_div"
                            className="fr"
                          >
                            <input
                              placeholder="Actual grade"
                              id="schoolPlanner_addCourse_grade_input"
                            />
                            <input
                              placeholder="Full grate"
                              id="schoolPlanner_addCourse_fullGrade_input"
                            />
                          </div>
                        </div>
                      </section>
                      <ul
                        id="schoolPlanner_addCourse_exams_ul"
                        className="fr"
                      ></ul>
                      <div id="schoolPlanner_addCourse_exam_label">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            this.addCourseExam();
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              this.addCourseExam();
                            }
                          }}
                        >
                          add
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div
              id="schoolPlanner_addCourse_addButton_label"
              role="button"
              tabIndex={0}
              onClick={() => {
                let buttonName = document.getElementById(
                  "schoolPlanner_addCourse_addButton_label",
                ).textContent;
                let course_name = document.getElementById(
                  "schoolPlanner_addCourse_name_input",
                ).value;
                let course_component = document.getElementById(
                  "schoolPlanner_addCourse_component_input",
                ).value;
                let course_year = document.getElementById(
                  "schoolPlanner_addCourse_year_input",
                ).value;
                let course_term = document.getElementById(
                  "schoolPlanner_addCourse_term_input",
                ).value;
                let course_class = document.getElementById(
                  "schoolPlanner_addCourse_class_input",
                ).value;
                let course_status = document.getElementById(
                  "schoolPlanner_addCourse_status_input",
                ).value;
                let course_grade = document.getElementById(
                  "schoolPlanner_addCourse_grade_input",
                ).value;
                let course_fullGrade = document.getElementById(
                  "schoolPlanner_addCourse_fullGrade_input",
                ).value;
                let exam_date = buildExamDateValue({
                  day: document.getElementById(
                    "schoolPlanner_addCourse_examDate_day_input",
                  ).value,
                  month: document.getElementById(
                    "schoolPlanner_addCourse_examDate_month_input",
                  ).value,
                  year: document.getElementById(
                    "schoolPlanner_addCourse_examDate_year_input",
                  ).value,
                });
                let exam_time = buildExamTimeValue({
                  hour: document.getElementById(
                    "schoolPlanner_addCourse_examTime_hour_input",
                  ).value,
                  minute: document.getElementById(
                    "schoolPlanner_addCourse_examTime_minute_input",
                  ).value,
                });
                if (buttonName === "Add") {
                  this.addCourse({
                    course_name: course_name + " (" + course_component + ")",
                    course_component: course_component,
                    course_year: course_year,
                    course_term: course_term,
                    course_class: course_class,
                    course_status: course_status,
                    course_grade: course_grade,
                    course_fullGrade: course_fullGrade,
                    course_length: 0,
                    course_progress: 0,
                    exam_date: exam_date,
                    exam_time: exam_time,
                  });
                }
                if (buttonName === "Edit") {
                  this.editCourse({
                    course_name: course_name + " (" + course_component + ")",
                    course_component: course_component,
                    course_year: course_year,
                    course_term: course_term,
                    course_class: course_class,
                    course_status: course_status,
                    course_grade: course_grade,
                    course_fullGrade: course_fullGrade,
                    course_length: 0,
                    course_progress: 0,
                    exam_date: exam_date,
                    exam_time: exam_time,
                  });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  let buttonName = document.getElementById(
                    "schoolPlanner_addCourse_addButton_label",
                  ).textContent;
                  let course_name = document.getElementById(
                    "schoolPlanner_addCourse_name_input",
                  ).value;
                  let course_component = document.getElementById(
                    "schoolPlanner_addCourse_component_input",
                  ).value;
                  let course_year = document.getElementById(
                    "schoolPlanner_addCourse_year_input",
                  ).value;
                  let course_term = document.getElementById(
                    "schoolPlanner_addCourse_term_input",
                  ).value;
                  let course_class = document.getElementById(
                    "schoolPlanner_addCourse_class_input",
                  ).value;
                  let course_status = document.getElementById(
                    "schoolPlanner_addCourse_status_input",
                  ).value;
                  let course_grade = document.getElementById(
                    "schoolPlanner_addCourse_grade_input",
                  ).value;
                  let course_fullGrade = document.getElementById(
                    "schoolPlanner_addCourse_fullGrade_input",
                  ).value;
                  let exam_type = document.getElementById(
                    "schoolPlanner_addCourse_examType_input",
                  ).value;
                  let exam_date = buildExamDateValue({
                    day: document.getElementById(
                      "schoolPlanner_addCourse_examDate_day_input",
                    ).value,
                    month: document.getElementById(
                      "schoolPlanner_addCourse_examDate_month_input",
                    ).value,
                    year: document.getElementById(
                      "schoolPlanner_addCourse_examDate_year_input",
                    ).value,
                  });
                  let exam_time = buildExamTimeValue({
                    hour: document.getElementById(
                      "schoolPlanner_addCourse_examTime_hour_input",
                    ).value,
                    minute: document.getElementById(
                      "schoolPlanner_addCourse_examTime_minute_input",
                    ).value,
                  });
                  if (buttonName === "Add") {
                    this.addCourse({
                      course_name: course_name + " (" + course_component + ")",
                      course_component: course_component,
                      course_year: course_year,
                      course_term: course_term,
                      course_class: course_class,
                      course_status: course_status,
                      course_grade: course_grade,
                      course_fullGrade: course_fullGrade,
                      course_length: 0,
                      course_progress: 0,
                      exam_type: exam_type,
                      exam_date: exam_date,
                      exam_time: exam_time,
                    });
                  }
                  if (buttonName === "Edit") {
                    this.editCourse({
                      course_name: course_name + " (" + course_component + ")",
                      course_component: course_component,
                      course_year: course_year,
                      course_term: course_term,
                      course_class: course_class,
                      course_status: course_status,
                      course_grade: course_grade,
                      course_fullGrade: course_fullGrade,
                      course_length: 0,
                      course_progress: 0,
                      exam_type: exam_type,
                      exam_date: exam_date,
                      exam_time: exam_time,
                    });
                  }
                }
              }}
            >
              Add
            </div>
          </div>
          <div id="div_progression" className="div_progression fc"></div>
        </article>
      </React.Fragment>
    );
  }
}
