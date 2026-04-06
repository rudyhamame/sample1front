import { Room, RoomEvent, Track } from "livekit-client";

export const buildLiveKitRoomName = (userId, friendId) => {
  const participants = [String(userId || "").trim(), String(friendId || "").trim()]
    .filter(Boolean)
    .sort();

  return `phenomed-${participants.join("-")}-${Date.now()}`;
};

export const createCallRoom = () =>
  new Room({
    adaptiveStream: true,
    dynacast: true,
    stopLocalTrackOnUnpublish: true,
  });

export const ensureMediaStream = (streamRef) => {
  if (!streamRef.current) {
    streamRef.current = new MediaStream();
  }

  return streamRef.current;
};

export const addTrackToStream = (streamRef, liveKitTrack) => {
  const mediaStreamTrack = liveKitTrack?.mediaStreamTrack;

  if (!mediaStreamTrack) {
    return false;
  }

  const stream = ensureMediaStream(streamRef);
  const alreadyAdded = stream
    .getTracks()
    .some((track) => track.id === mediaStreamTrack.id);

  if (!alreadyAdded) {
    stream.addTrack(mediaStreamTrack);
    return true;
  }

  return false;
};

export const removeTrackFromStream = (streamRef, liveKitTrack) => {
  const mediaStreamTrack = liveKitTrack?.mediaStreamTrack;
  const stream = streamRef.current;

  if (!mediaStreamTrack || !stream) {
    return false;
  }

  const existingTrack = stream
    .getTracks()
    .find((track) => track.id === mediaStreamTrack.id);

  if (!existingTrack) {
    return false;
  }

  stream.removeTrack(existingTrack);

  if (stream.getTracks().length === 0) {
    streamRef.current = null;
  }

  return true;
};

export const syncParticipantTracks = (participant, streamRef, { kind } = {}) => {
  if (!participant?.trackPublications) {
    return false;
  }

  let didChange = false;

  participant.trackPublications.forEach((publication) => {
    const track = publication?.track;

    if (!track) {
      return;
    }

    if (kind && track.kind !== kind) {
      return;
    }

    if (addTrackToStream(streamRef, track)) {
      didChange = true;
    }
  });

  return didChange;
};

export { RoomEvent, Track };
