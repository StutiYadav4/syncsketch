const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/ping", (req, res) => res.send("pong"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL,
    ],
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

const USER_COLORS = [
  "#ef4444","#3b82f6","#22c55e","#eab308",
  "#a855f7","#ec4899","#f97316","#14b8a6",
  "#f43f5e","#06b6d4",
];

const MAX_USERS = 10;
const MAX_VOICE_SIZE = 1 * 1024 * 1024; // 1MB base64

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoomUsers(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return [];
  return Array.from(room.users.entries()).map(([id, u]) => ({
    id,
    username: u.username,
    color: u.color,
    isDrawing: u.isDrawing,
  }));
}

// Rate limiting — max 30 messages per minute per socket
const messageRates = new Map();
function isRateLimited(socketId) {
  const now = Date.now();
  const history = messageRates.get(socketId) || [];
  const recent = history.filter((t) => now - t < 60000);
  if (recent.length >= 30) return true;
  recent.push(now);
  messageRates.set(socketId, recent);
  return false;
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // Create room
  socket.on("create-room", ({ username, roomName, password }, callback) => {
    if (!username?.trim() || !roomName?.trim()) {
      return callback({ success: false, error: "Username and room name required" });
    }
    const code = generateCode();
    const color = USER_COLORS[0];
    rooms.set(code, {
      name: roomName.trim(),
      password: password?.trim() || null,
      strokes: [],
      users: new Map([[socket.id, { username: username.trim(), color, isDrawing: false }]]),
    });
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.username = username.trim();
    callback({
      success: true,
      roomCode: code,
      roomName: roomName.trim(),
      color,
      strokes: [],
      users: getRoomUsers(code),
      isPasswordProtected: !!password?.trim(),
    });
    io.to(code).emit("user-list", getRoomUsers(code));
  });

  // Join room
  socket.on("join-room", ({ username, roomCode, password }, callback) => {
    if (!username?.trim() || !roomCode?.trim()) {
      return callback({ success: false, error: "Username and room code required" });
    }
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room) return callback({ success: false, error: "Room not found" });
    if (room.users.size >= MAX_USERS) {
      return callback({ success: false, error: "Room is full (max 10 users)" });
    }
    if (room.password && room.password !== password?.trim()) {
      return callback({ success: false, error: "Incorrect password" });
    }

    const usedColors = Array.from(room.users.values()).map((u) => u.color);
    const color = USER_COLORS.find((c) => !usedColors.includes(c)) || USER_COLORS[room.users.size % USER_COLORS.length];

    room.users.set(socket.id, { username: username.trim(), color, isDrawing: false });
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.username = username.trim();

    socket.to(code).emit("chat-message", {
      id: Date.now(),
      type: "system",
      text: `${username.trim()} joined the room`,
      timestamp: new Date().toISOString(),
    });

    callback({
      success: true,
      roomCode: code,
      roomName: room.name,
      color,
      strokes: room.strokes,
      users: getRoomUsers(code),
      isPasswordProtected: !!room.password,
    });

    io.to(code).emit("user-list", getRoomUsers(code));
  });

  // Draw
  socket.on("draw", (stroke) => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) return;
    if (!Array.isArray(stroke) || stroke.length === 0) return;
    rooms.get(code).strokes.push(stroke);
    socket.to(code).emit("draw", stroke);
  });

  // Drawing status
  socket.on("drawing-status", (isDrawing) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (user) {
      user.isDrawing = isDrawing;
      io.to(code).emit("user-list", getRoomUsers(code));
    }
  });

  // Cursor position
  socket.on("cursor-move", ({ x, y }) => {
    const code = socket.data.roomCode;
    if (!code) return;
    socket.to(code).emit("cursor-move", {
      id: socket.id,
      username: socket.data.username,
      x, y,
    });
  });

  // Clear canvas
  socket.on("clear-canvas", () => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) return;
    rooms.get(code).strokes = [];
    io.to(code).emit("clear-canvas");
  });

  // Chat
  socket.on("chat-message", (text) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    if (typeof text !== "string" || text.trim().length === 0) return;
    if (text.length > 500) return;
    if (isRateLimited(socket.id)) return;
    const user = room.users.get(socket.id);
    const msg = {
      id: Date.now(),
      type: "user",
      username: user?.username || "Unknown",
      color: user?.color || "#fff",
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    io.to(code).emit("chat-message", msg);
  });

  // Voice message
  socket.on("voice-message", (audioData) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    if (typeof audioData !== "string") return;
    if (audioData.length > MAX_VOICE_SIZE) return;
    const user = room.users.get(socket.id);
    const msg = {
      id: Date.now(),
      type: "voice",
      username: user?.username || "Unknown",
      color: user?.color || "#fff",
      audioData,
      timestamp: new Date().toISOString(),
    };
    io.to(code).emit("chat-message", msg);
  });

  // Disconnect
  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    messageRates.delete(socket.id);
    if (!room) return;
    const user = room.users.get(socket.id);
    room.users.delete(socket.id);
    socket.to(code).emit("cursor-remove", socket.id);
    if (room.users.size === 0) {
      rooms.delete(code);
    } else {
      socket.to(code).emit("chat-message", {
        id: Date.now(),
        type: "system",
        text: `${user?.username || "Someone"} left the room`,
        timestamp: new Date().toISOString(),
      });
      io.to(code).emit("user-list", getRoomUsers(code));
    }
  });
});

server.listen(3001, () => console.log("Server running on port 3001"));