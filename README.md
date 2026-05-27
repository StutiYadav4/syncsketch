# SyncSketch 🎨

**Real-time Collaborative Whiteboard**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-syncsketch--seven.vercel.app-blue?style=for-the-badge)](https://syncsketch-seven.vercel.app/)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)

A full-stack real-time collaborative whiteboard where multiple users can draw, chat, and communicate together — live, in the same room.

---

## 🚀 Live Demo

👉 **[https://syncsketch-seven.vercel.app/](https://syncsketch-seven.vercel.app/)**

Create a room, share the code with a friend, and start drawing together instantly.

---

## ✨ Features

### 🎨 Drawing Tools
- **Freehand pen** with adjustable brush size and color
- **Shape tools** — Rectangle, Circle, Triangle, Line, Arrow
- **Text tool** — click anywhere to place text, drag to reposition before placing
- **Eraser** tool
- **Undo** last stroke
- **Clear canvas** for everyone in the room
- **Export as PNG** — download the canvas with one click
- All drawing synced in **real-time** across all users

### 👥 Rooms & Users
- Create a room with a **custom name**
- Optional **password protection** for private rooms
- Join any room with a **6-character room code**
- **Maximum 10 users** per room
- Each user gets a unique **color** assigned automatically
- See who's **currently drawing** with live indicator
- Live **user list** with colored avatars

### 💬 Chat
- Real-time **text chat** in every room
- **Emoji picker** with 60+ emojis
- **Voice messages** — tap mic to record, tap again to send, play back anytime
- Message **timestamps** on every message
- System messages for **join/leave** events

### 🖱️ Cursor Presence
- See **every user's cursor** moving on the canvas in real time
- **Name tag** and colored dot follows each user's cursor
- Cursors disappear when users leave

### 📱 Mobile Support
- Fully **touch-compatible** canvas (draw with your finger)
- Sidebar **auto-hides** on mobile with a toggle button
- Responsive layout across all screen sizes

### 🔒 Security & Reliability
- **Rate limiting** — max 30 chat messages per minute per user
- **Voice message size limit** — 1MB max
- **Input validation** on both frontend and backend
- **Canvas boundary clamping** — nothing draws outside the whiteboard
- Room auto-deletes when last user leaves

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express |
| Real-time | Socket.io |
| Drawing | HTML5 Canvas API |
| Voice | MediaRecorder API (WebRTC) |
| Icons | Lucide React |
| Deployment | Vercel (frontend), Render (backend) |

---

## 📁 Project Structure

```
syncsketch/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.jsx   # Username, create/join room, password
│   │   │   ├── CanvasBoard.jsx   # Main canvas, tools, cursor presence
│   │   │   ├── Toolbar.jsx       # Tool selection, colors, brush size
│   │   │   └── ChatSidebar.jsx   # Chat, voice messages, emoji, users
│   │   ├── socket/
│   │   │   └── socket.js         # Socket.io client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
└── backend/
    ├── server.js                 # Express + Socket.io server
    └── package.json
```

---

## 🏃 Running Locally

### Prerequisites
- Node.js 18+
- npm

### Backend
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

### Environment Variables

**Frontend** — create `frontend/.env`:
```
VITE_BACKEND_URL=http://localhost:3001
```

**Backend** — create `backend/.env`:
```
FRONTEND_URL=http://localhost:5173
```

---

## 🌐 Deployment

| Service | Purpose | URL |
|---|---|---|
| Vercel | Frontend hosting | Auto-deploys on every `git push` |
| Render | Backend hosting | Auto-deploys on every `git push` |

### Deploy your own

1. Push this repo to GitHub
2. **Render** → New Web Service → select `backend/` folder → set `FRONTEND_URL` env var
3. **Vercel** → New Project → select `frontend/` folder → set `VITE_BACKEND_URL` env var

---

## 🎮 How to Use

1. Open the [live demo](https://syncsketch-seven.vercel.app/)
2. Enter your username
3. **Create a room** — give it a name, optionally set a password
4. Share the **6-character room code** with collaborators
5. Others join by entering the code (and password if set)
6. Draw, chat, send voice messages — everything syncs live!

---

## 📸 Screenshots

<img width="1919" height="866" alt="image" src="https://github.com/user-attachments/assets/fe065245-3c8d-4e04-96a3-49b84eedbf59" />

