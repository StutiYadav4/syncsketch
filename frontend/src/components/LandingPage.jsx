import { useState } from "react";
import { Pencil, Plus, LogIn, Loader2, Lock } from "lucide-react";
import { socket } from "../socket/socket";

const LandingPage = ({ onJoin }) => {
  const [mode, setMode] = useState(null);
  const [username, setUsername] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    if (!username.trim() || !roomName.trim()) return setError("Fill in all fields");
    setLoading(true);
    socket.emit("create-room", {
      username: username.trim(),
      roomName: roomName.trim(),
      password: password.trim() || null,
    }, (res) => {
      setLoading(false);
      if (res.success) onJoin({ username: username.trim(), ...res });
      else setError(res.error);
    });
  };

  const handleJoin = () => {
    if (!username.trim() || !roomCode.trim()) return setError("Fill in all fields");
    setLoading(true);
    socket.emit("join-room", {
      username: username.trim(),
      roomCode: roomCode.trim(),
      password: password.trim() || null,
    }, (res) => {
      setLoading(false);
      if (res.success) onJoin({ username: username.trim(), ...res });
      else setError(res.error);
    });
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-900/50">
            <Pencil size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">SyncSketch</h1>
          <p className="text-blue-300 mt-2 text-sm">Real-time collaborative whiteboard</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Your Name</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {!mode && (
            <div className="flex flex-col gap-3">
              <button onClick={() => setMode("create")}
                className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/40">
                <Plus size={20} /> Create a Room
              </button>
              <button onClick={() => setMode("join")}
                className="flex items-center justify-center gap-3 w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all">
                <LogIn size={20} /> Join a Room
              </button>
            </div>
          )}

          {mode === "create" && (
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Room name (e.g. Design Sprint)"
                value={roomName}
                onChange={(e) => { setRoomName(e.target.value); setError(""); }}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="Password (optional — leave blank for public)"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleCreate} disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Create Room
              </button>
              <button onClick={() => { setMode(null); setError(""); setPassword(""); }}
                className="text-slate-400 hover:text-white text-sm transition">← Back</button>
            </div>
          )}

          {mode === "join" && (
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Room code (e.g. AB12CD)"
                value={roomCode}
                onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(""); }}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono tracking-widest uppercase"
              />
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="Password (if room is protected)"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleJoin} disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                Join Room
              </button>
              <button onClick={() => { setMode(null); setError(""); setPassword(""); }}
                className="text-slate-400 hover:text-white text-sm transition">← Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;