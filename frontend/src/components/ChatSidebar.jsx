import { useState, useEffect, useRef } from "react";
import { Send, Users, MessageSquare, Copy, Check } from "lucide-react";
import { socket } from "../socket/socket";

const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const ChatSidebar = ({ session, users }) => {
  const [tab, setTab] = useState("chat"); // "chat" | "users"
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => socket.off("chat-message");
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit("chat-message", input.trim());
    setInput("");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(session.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const drawingUsers = users.filter((u) => u.isDrawing);

  return (
    <div className="w-72 flex flex-col bg-slate-900/90 backdrop-blur-xl border-l border-slate-700 h-full">
      {/* Room info */}
      <div className="px-4 py-4 border-b border-slate-700">
        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Room</p>
        <h2 className="text-white font-bold text-lg leading-tight">{session.roomName}</h2>
        <button
          onClick={copyCode}
          className="flex items-center gap-2 mt-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition w-full"
        >
          <span className="font-mono text-blue-400 text-sm tracking-widest flex-1 text-left">
            {session.roomCode}
          </span>
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-400" />}
        </button>
        {drawingUsers.length > 0 && (
          <p className="text-xs text-amber-400 mt-2 animate-pulse">
            ✏️ {drawingUsers.map((u) => u.username).join(", ")} {drawingUsers.length === 1 ? "is" : "are"} drawing...
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setTab("chat")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
            tab === "chat" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <MessageSquare size={15} /> Chat
        </button>
        <button
          onClick={() => setTab("users")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
            tab === "users" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <Users size={15} /> Users ({users.length})
        </button>
      </div>

      {/* Chat tab */}
      {tab === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 scrollbar-thin">
            {messages.length === 0 && (
              <p className="text-slate-500 text-xs text-center mt-8">No messages yet. Say hi!</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === "system" ? (
                  <p className="text-center text-slate-500 text-xs py-1">{msg.text}</p>
                ) : (
                  <div className={`flex flex-col ${msg.username === session.username ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold" style={{ color: msg.color }}>
                        {msg.username === session.username ? "You" : msg.username}
                      </span>
                      <span className="text-slate-600 text-xs">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] break-words ${
                        msg.username === session.username
                          ? "bg-blue-600 text-white rounded-tr-sm"
                          : "bg-slate-700 text-slate-100 rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              <button
                onClick={sendMessage}
                className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2.5">
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: u.color }}
              >
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {u.username}
                  {u.username === session.username && (
                    <span className="text-slate-500 text-xs ml-1">(you)</span>
                  )}
                </p>
                {u.isDrawing && (
                  <p className="text-amber-400 text-xs animate-pulse">drawing...</p>
                )}
              </div>
              <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;