const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.get("/ping", (req, res) => res.send("pong"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL, // add this after Vercel deploy
    ], methods: ["GET", "POST"] },
});

// roomCode -> { name, strokes, users: Map<socketId, {username, color, isDrawing}> }
const rooms = new Map();

const USER_COLORS = [
  "#ef4444","#3b82f6","#22c55e","#eab308",
  "#a855f7","#ec4899","#f97316","#14b8a6",
  "#f43f5e","#06b6d4",
];

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

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // Create a new room
  socket.on("create-room", ({ username, roomName }, callback) => {
    const code = generateCode();
    const color = USER_COLORS[0];
    rooms.set(code, {
      name: roomName,
      strokes: [],
      users: new Map([[socket.id, { username, color, isDrawing: false }]]),
    });
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.username = username;
    callback({
      success: true,
      roomCode: code,
      roomName,
      color,
      strokes: [],
      users: getRoomUsers(code),
    });
    io.to(code).emit("user-list", getRoomUsers(code));
  });

  // Join existing room
  socket.on("join-room", ({ username, roomCode }, callback) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room) return callback({ success: false, error: "Room not found" });

    const usedColors = Array.from(room.users.values()).map((u) => u.color);
    const color = USER_COLORS.find((c) => !usedColors.includes(c)) || USER_COLORS[room.users.size % USER_COLORS.length];

    room.users.set(socket.id, { username, color, isDrawing: false });
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.username = username;

    // Send join notification
    socket.to(code).emit("chat-message", {
      id: Date.now(),
      type: "system",
      text: `${username} joined the room`,
      timestamp: new Date().toISOString(),
    });

    callback({
      success: true,
      roomCode: code,
      roomName: room.name,
      color,
      strokes: room.strokes,
      users: getRoomUsers(code),
    });

    io.to(code).emit("user-list", getRoomUsers(code));
  });

  // Drawing
  socket.on("draw", (stroke) => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) return;
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
    const user = room.users.get(socket.id);
    const msg = {
      id: Date.now(),
      type: "user",
      username: user?.username || "Unknown",
      color: user?.color || "#fff",
      text,
      timestamp: new Date().toISOString(),
    };
    io.to(code).emit("chat-message", msg);
  });

  // Voice message
  socket.on("voice-message", (audioData) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    const user = room.users.get(socket.id);
    const msg = {
      id: Date.now(),
      type: "voice",
      username: user?.username || "Unknown",
      color: user?.color || "#fff",
      audioData, // base64 string
      timestamp: new Date().toISOString(),
    };
    io.to(code).emit("chat-message", msg);
  });

  // Disconnect
  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    const user = room.users.get(socket.id);
    room.users.delete(socket.id);
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