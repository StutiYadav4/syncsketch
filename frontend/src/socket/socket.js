import { io } from "socket.io-client";

const URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export const socket = io(URL, {
  transports: ["websocket", "polling"], // important for Render
});