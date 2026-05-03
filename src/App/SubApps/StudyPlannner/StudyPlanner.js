import React from "react";
import SchoolPlannerEn from "../../../SchoolPlanner/SchoolPlanner_en";
import SchoolPlannerAr from "../../../SchoolPlanner/SchoolPlanner_ar";
import {
  getPlannerMusicSnapshot as getNogaPlannerMusicSnapshot,
  playNextSharedPlannerMusicTrack as playNextNogaPlannerMusicTrack,
  playPreviousSharedPlannerMusicTrack as playPreviousNogaPlannerMusicTrack,
  toggleSharedPlannerMusic as toggleNogaPlannerMusic,
} from "../../../music/globalMusicPlayer";

const PLANNER_MUSIC_SESSION_EVENT = "planner-music-session-change";

let sharedStudyPlannerController = null;
let sharedStudyPlannerSnapshot = {
  isReady: false,
  isPlaying: false,
  trackTitle: "Planner Music",
  trackArtist: "Internet Archive",
  volume: 0.42,
};

const emitPlannerMusicSnapshot = (nextSnapshot) => {
  sharedStudyPlannerSnapshot = {
    ...sharedStudyPlannerSnapshot,
    ...nextSnapshot,
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PLANNER_MUSIC_SESSION_EVENT, {
        detail: { ...sharedStudyPlannerSnapshot },
      }),
    );
  }
};

const buildPlannerMusicSnapshotFromInstance = (instance) => {
  const nextState = instance?.state || {};
  const hasPlaylist =
    Array.isArray(instance?.musicPlaylist) && instance.musicPlaylist.length > 0;
  const trackTitle = String(
    nextState.music_trackTitle || "Planner Music",
  ).trim();
  const trackArtist = String(
    nextState.music_trackArtist || "Internet Archive",
  ).trim();
  const isArchiveUnavailable = trackTitle === "Archive Unavailable";

  return {
    isReady: !nextState.music_isLoading && hasPlaylist && !isArchiveUnavailable,
    isPlaying: Boolean(nextState.music_isPlaying),
    trackTitle,
    trackArtist,
    volume: Number(nextState.music_volume) || 0.42,
  };
};

const syncStudyPlannerMusicSnapshot = (instance) => {
  if (!instance) {
    emitPlannerMusicSnapshot({
      isReady: false,
      isPlaying: false,
      trackTitle: "Planner Music",
      trackArtist: "Internet Archive",
      volume: 0.42,
    });
    return;
  }

  emitPlannerMusicSnapshot(buildPlannerMusicSnapshotFromInstance(instance));
};

const registerStudyPlannerController = (instance) => {
  if (!instance) {
    return;
  }

  if (!instance.__sharedPlannerMusicPatched) {
    const originalSetState = instance.setState.bind(instance);

    instance.setState = (updater, callback) =>
      originalSetState(updater, (...args) => {
        syncStudyPlannerMusicSnapshot(instance);

        if (typeof callback === "function") {
          callback(...args);
        }
      });

    instance.__sharedPlannerMusicPatched = true;
  }

  sharedStudyPlannerController = instance;
  syncStudyPlannerMusicSnapshot(instance);
};

export const getPlannerMusicSnapshot = () =>
  sharedStudyPlannerController
    ? { ...sharedStudyPlannerSnapshot }
    : getNogaPlannerMusicSnapshot();

export const toggleSharedPlannerMusic = () =>
  sharedStudyPlannerController?.togglePlannerMusic?.() ||
  toggleNogaPlannerMusic();

export const playNextSharedPlannerMusicTrack = (autoplay = true) =>
  sharedStudyPlannerController?.playNextPlannerMusicTrack?.(autoplay) ||
  playNextNogaPlannerMusicTrack(autoplay);

export const playPreviousSharedPlannerMusicTrack = (autoplay = true) =>
  sharedStudyPlannerController?.playPreviousPlannerMusicTrack?.(autoplay) ||
  playPreviousNogaPlannerMusicTrack(autoplay);

const StudyPlanner = (props) => {
  const PlannerComponent =
    props.locale === "ar" ? SchoolPlannerAr : SchoolPlannerEn;
  const plannerRef = React.useRef(null);

  React.useEffect(() => {
    const currentPlanner = plannerRef.current;

    if (currentPlanner) {
      registerStudyPlannerController(currentPlanner);
    }

    return () => {
      if (sharedStudyPlannerController === currentPlanner) {
        sharedStudyPlannerController = null;
        syncStudyPlannerMusicSnapshot(null);
      }
    };
  }, [props.locale]);

  return (
    <PlannerComponent
      ref={plannerRef}
      state={props.state}
      locale={props.locale === "ar" ? "ar" : "en"}
      logOut={props.logOut}
      acceptFriend={props.acceptFriend}
      type={props.type}
      show_profile={props.show_profile}
      memory={props.memory}
      serverReply={props.serverReply}
    />
  );
};

export default StudyPlanner;
