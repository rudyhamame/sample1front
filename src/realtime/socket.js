import { io } from "socket.io-client";
import { API_BASE_URL } from "../config/api";

export const connectRealtime = ({
  userId,
  onUserRefresh,
  onChatPresence,
  onTypingPresence,
  onConnected,
}) => {
  if (!userId) {
    return null;
  }

  const socket = io(API_BASE_URL, {
    transports: ["websocket"],
    reconnection: true,
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

  if (typeof onChatPresence === "function") {
    socket.on("chat:presence", onChatPresence);
  }

  if (typeof onTypingPresence === "function") {
    socket.on("chat:typing", onTypingPresence);
  }

  socket.connect();

  return socket;
};
