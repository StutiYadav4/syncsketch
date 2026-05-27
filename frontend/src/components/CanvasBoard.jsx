import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { socket } from "../socket/socket";
import Toolbar from "./Toolbar";
import ChatSidebar from "./ChatSidebar";

const CanvasBoard = ({ session }) => {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const [activeTool, setActiveTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [strokes, setStrokes] = useState(session.strokes || []);
  const [users, setUsers] = useState(session.users || []);
  const [cursors, setCursors] = useState({});
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const drawing = useRef(false);
  const startPoint = useRef(null);
  const previousPoint = useRef(null);
  const currentStroke = useRef([]);

  const [textInput, setTextInput] = useState(null);
  const [textValue, setTextValue] = useState("");
  const textInputRef = useRef(null);
  const textDragRef = useRef(null);

  const TOOLBAR_HEIGHT = 90;
  const SIDEBAR_WIDTH = 320;

  // Detect mobile
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setShowSidebar(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      const sidebarW = showSidebar && !isMobile ? SIDEBAR_WIDTH : 0;
      canvas.width = window.innerWidth - sidebarW;
      canvas.height = window.innerHeight - TOOLBAR_HEIGHT;
      overlay.width = canvas.width;
      overlay.height = canvas.height;
      const ctx = canvas.getContext("2d");
      initializeCanvas(ctx);
      strokes.forEach((s) => renderStroke(s, ctx));
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [showSidebar, isMobile]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    if (session.strokes?.length) {
      session.strokes.forEach((s) => renderStroke(s, ctx));
    }

    socket.on("draw", (stroke) => {
      renderStroke(stroke, canvasRef.current.getContext("2d"));
      setStrokes((prev) => [...prev, stroke]);
    });
    socket.on("clear-canvas", () => {
      initializeCanvas(canvasRef.current.getContext("2d"));
      setStrokes([]);
    });
    socket.on("user-list", setUsers);
    socket.on("cursor-move", ({ id, username, x, y }) => {
      setCursors((prev) => ({ ...prev, [id]: { username, x, y } }));
    });
    socket.on("cursor-remove", (id) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    return () => {
      socket.off("draw");
      socket.off("clear-canvas");
      socket.off("user-list");
      socket.off("cursor-move");
      socket.off("cursor-remove");
    };
  }, []);

  useEffect(() => {
    if (textInput) setTimeout(() => textInputRef.current?.focus(), 50);
  }, [textInput]);

  const initializeCanvas = (ctx) => {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clamp(clientX - rect.left, 0, canvasRef.current.width),
      y: clamp(clientY - rect.top, 0, canvasRef.current.height),
    };
  };

  const emitCursor = (e) => {
    const pos = getPos(e);
    socket.emit("cursor-move", pos);
  };

  const drawSegment = (seg, ctx) => {
    ctx.beginPath();
    ctx.moveTo(seg.x0, seg.y0);
    ctx.lineTo(seg.x1, seg.y1);
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = seg.size;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.closePath();
  };

  const drawShape = (ctx, tool, x0, y0, x1, y1, strokeColor, size) => {
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "line") {
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    } else if (tool === "arrow") {
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const headLen = Math.max(15, size * 4);
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - headLen * Math.cos(angle - Math.PI / 6), y1 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - headLen * Math.cos(angle + Math.PI / 6), y1 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (tool === "rect") {
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    } else if (tool === "circle") {
      const rx = Math.abs(x1 - x0) / 2;
      const ry = Math.abs(y1 - y0) / 2;
      ctx.ellipse(x0 + (x1 - x0) / 2, y0 + (y1 - y0) / 2, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (tool === "triangle") {
      ctx.moveTo((x0 + x1) / 2, y0);
      ctx.lineTo(x1, y1); ctx.lineTo(x0, y1);
      ctx.closePath(); ctx.stroke();
    }
  };

  const renderStroke = (stroke, ctx) => {
    if (!stroke.length) return;
    const first = stroke[0];
    if (first.tool === "text") {
      const fontSize = Math.max(16, first.size * 3);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = first.color;
      ctx.fillText(first.text, first.x, first.y);
    } else if (first.tool && first.tool !== "pen" && first.tool !== "eraser") {
      drawShape(ctx, first.tool, first.x0, first.y0, first.x1, first.y1, first.color, first.size);
    } else {
      stroke.forEach((seg) => drawSegment(seg, ctx));
    }
  };

  const redrawCanvas = (allStrokes) => {
    const ctx = canvasRef.current.getContext("2d");
    initializeCanvas(ctx);
    allStrokes.forEach((s) => renderStroke(s, ctx));
  };

  // Export PNG
  const exportPNG = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = `syncsketch-${session.roomCode}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Draggable text box
  const handleTextMouseDown = (e) => {
    e.stopPropagation();
    textDragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: textInput.x,
      startY: textInput.y,
    };
    const onMove = (moveE) => {
      if (!textDragRef.current) return;
      const canvas = canvasRef.current;
      const dx = moveE.clientX - textDragRef.current.startMouseX;
      const dy = moveE.clientY - textDragRef.current.startMouseY;
      setTextInput({
        x: clamp(textDragRef.current.startX + dx, 0, canvas.width - 120),
        y: clamp(textDragRef.current.startY + dy, 20, canvas.height),
      });
    };
    const onUp = () => {
      textDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (activeTool === "text") {
      setTextInput(pos);
      setTextValue("");
      return;
    }
    drawing.current = true;
    startPoint.current = pos;
    previousPoint.current = pos;
    currentStroke.current = [];
    socket.emit("drawing-status", true);
  };

  const handleMouseMove = (e) => {
    e.preventDefault();
    emitCursor(e);
    if (!drawing.current) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    const overlayCtx = overlayRef.current.getContext("2d");

    if (activeTool === "pen" || activeTool === "eraser") {
      const drawColor = activeTool === "eraser" ? "#FFFFFF" : color;
      const seg = {
        x0: previousPoint.current.x, y0: previousPoint.current.y,
        x1: pos.x, y1: pos.y,
        color: drawColor, size: brushSize, tool: activeTool,
      };
      drawSegment(seg, ctx);
      currentStroke.current.push(seg);
      socket.emit("draw", [seg]);
      previousPoint.current = pos;
    } else {
      overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      drawShape(overlayCtx, activeTool, startPoint.current.x, startPoint.current.y, pos.x, pos.y, color, brushSize);
    }
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    drawing.current = false;
    socket.emit("drawing-status", false);
    const pos = getPos(e);
    const overlayCtx = overlayRef.current.getContext("2d");
    overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

    if (activeTool !== "pen" && activeTool !== "eraser") {
      const shapeSeg = [{
        tool: activeTool,
        x0: startPoint.current.x, y0: startPoint.current.y,
        x1: pos.x, y1: pos.y,
        color, size: brushSize,
      }];
      drawShape(canvasRef.current.getContext("2d"), activeTool,
        startPoint.current.x, startPoint.current.y, pos.x, pos.y, color, brushSize);
      setStrokes((prev) => [...prev, shapeSeg]);
      socket.emit("draw", shapeSeg);
    } else {
      if (currentStroke.current.length > 0) {
        setStrokes((prev) => [...prev, currentStroke.current]);
      }
    }
    previousPoint.current = null;
  };

  const commitText = () => {
    if (!textValue.trim() || !textInput) { setTextInput(null); return; }
    const canvas = canvasRef.current;
    const fontSize = Math.max(16, brushSize * 3);
    const x = clamp(textInput.x, 0, canvas.width - 10);
    const y = clamp(textInput.y, fontSize, canvas.height);
    const stroke = [{ tool: "text", x, y, text: textValue, color, size: brushSize }];
    const ctx = canvas.getContext("2d");
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(textValue, x, y);
    setStrokes((prev) => [...prev, stroke]);
    socket.emit("draw", stroke);
    setTextInput(null);
    setTextValue("");
  };

  const clearCanvas = () => {
    initializeCanvas(canvasRef.current.getContext("2d"));
    setStrokes([]);
    socket.emit("clear-canvas");
  };

  const undoLastStroke = () => {
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    redrawCanvas(updated);
  };

  // Find my color
  const myColor = users.find((u) => u.username === session.username)?.color || "#3b82f6";

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex flex-col overflow-hidden">
      <Toolbar
        color={color} setColor={setColor}
        brushSize={brushSize} setBrushSize={setBrushSize}
        clearCanvas={clearCanvas} undoLastStroke={undoLastStroke}
        activeTool={activeTool} setActiveTool={setActiveTool}
        onExport={exportPNG}
      />

      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: `${TOOLBAR_HEIGHT}px` }}>
        {/* Canvas area */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 cursor-crosshair touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          />
          <canvas
            ref={overlayRef}
            className="absolute top-0 left-0 pointer-events-none"
          />

          {/* Other users' cursors */}
          {Object.entries(cursors).map(([id, cursor]) => {
            const cursorUser = users.find((u) => u.id === id);
            const cursorColor = cursorUser?.color || "#3b82f6";
            return (
              <div
                key={id}
                className="absolute pointer-events-none z-40 flex flex-col items-start"
                style={{ left: cursor.x, top: cursor.y, transform: "translate(8px, 8px)" }}
              >
                {/* Cursor dot */}
                <div className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: cursorColor, transform: "translate(-8px, -8px)" }} />
                {/* Name tag */}
                <div className="text-white text-xs px-2 py-0.5 rounded-full shadow-lg font-medium whitespace-nowrap"
                  style={{ backgroundColor: cursorColor }}>
                  {cursor.username}
                </div>
              </div>
            );
          })}

          {/* Draggable text input */}
          {textInput && (
            <div
              style={{
                position: "absolute",
                left: textInput.x,
                top: textInput.y - 28,
                zIndex: 50,
                cursor: "move",
                userSelect: "none",
              }}
              onMouseDown={handleTextMouseDown}
            >
              <div className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-t-lg flex items-center justify-between gap-4 select-none">
                <span>⠿ drag</span>
                <span className="opacity-60 text-xs">Enter to place • Esc to cancel</span>
              </div>
              <input
                ref={textInputRef}
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitText();
                  if (e.key === "Escape") setTextInput(null);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  fontSize: `${Math.max(16, brushSize * 3)}px`,
                  color: color,
                  background: "rgba(255,255,255,0.95)",
                  border: "1.5px solid #3b82f6",
                  borderTop: "none",
                  outline: "none",
                  minWidth: "160px",
                  padding: "4px 8px",
                  fontFamily: "Inter, sans-serif",
                  borderRadius: "0 0 8px 8px",
                  cursor: "text",
                }}
              />
            </div>
          )}

          {/* Mobile sidebar toggle */}
          {isMobile && (
            <button
              onClick={() => setShowSidebar((prev) => !prev)}
              className="absolute top-3 right-3 z-50 p-2 bg-slate-800/90 border border-slate-600 rounded-xl text-white shadow-lg"
            >
              <MessageSquare size={20} />
            </button>
          )}
        </div>

        {/* Sidebar — hidden on mobile unless toggled */}
        {(showSidebar || !isMobile) && (
          <div className={`${isMobile ? "absolute right-0 top-0 h-full z-40 shadow-2xl" : "relative"}`}>
            <ChatSidebar session={session} users={users} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasBoard;