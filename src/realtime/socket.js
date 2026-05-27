import { io } from "socket.io-client";
import { API_BASE_URL } from "../config/api";

export const connectRealtime = ({
  userId,
  onUserRefresh,
  onChatRead,
  onChatPresence,
  onTypingPresence,
  onVisitLog,
  onConnected,
}) => {
  if (!userId) {
    return null;
  }

  const socket = io(API_BASE_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 4,
    reconnectionDelay: 2500,
    reconnectionDelayMax: 8000,
    timeout: 6000,
    autoConnect: false,
  });

  const joinUserRoom = () => {
    socket.emit("user:join", {
      userId,
    });

    if (typeof onConnected === "function") {
      onConnected(socket);
    }
  };

  socket.on("connect", joinUserRoom);

  if (typeof onUserRefresh === "function") {
    socket.on("user:refresh", onUserRefresh);
  }

  if (typeof onChatRead === "function") {
    socket.on("chat:read", onChatRead);
  }

  if (typeof onChatPresence === "function") {
    socket.on("chat:presence", onChatPresence);
  }

  if (typeof onTypingPresence === "function") {
    socket.on("chat:typing", onTypingPresence);
  }

  if (typeof onVisitLog === "function") {
    socket.on("visit-log:new", onVisitLog);
  }

  socket.on("connect_error", () => {
    // Keep silent when backend is offline to avoid console noise from retries.
  });

  socket.connect();

  return socket;
};
