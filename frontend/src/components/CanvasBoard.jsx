import { useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";
import Toolbar from "./Toolbar";
import ChatSidebar from "./ChatSidebar";

const CanvasBoard = ({ session }) => {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null); // for shape preview
  const [activeTool, setActiveTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [strokes, setStrokes] = useState(session.strokes || []);
  const [users, setUsers] = useState(session.users || []);

  const drawing = useRef(false);
  const startPoint = useRef(null);
  const previousPoint = useRef(null);
  const currentStroke = useRef([]);

  // Text input state
  const [textInput, setTextInput] = useState(null); // { x, y }
  const [textValue, setTextValue] = useState("");
  const textInputRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth - 288; // minus sidebar
    canvas.height = window.innerHeight - 90;
    const overlay = overlayRef.current;
    overlay.width = canvas.width;
    overlay.height = canvas.height;

    const ctx = canvas.getContext("2d");
    initializeCanvas(ctx);

    if (session.strokes?.length) {
      session.strokes.forEach((s) => renderStroke(s, ctx));
    }

    socket.on("draw", (stroke) => {
      renderStroke(stroke, ctx);
      setStrokes((prev) => [...prev, stroke]);
    });
    socket.on("clear-canvas", () => {
      initializeCanvas(ctx);
      setStrokes([]);
    });
    socket.on("user-list", setUsers);

    return () => {
      socket.off("draw");
      socket.off("clear-canvas");
      socket.off("user-list");
    };
  }, []);

  // Focus text input when it appears
  useEffect(() => {
    if (textInput) setTimeout(() => textInputRef.current?.focus(), 50);
  }, [textInput]);

  const initializeCanvas = (ctx) => {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ── Freehand ──
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

  // ── Shapes ──
  const drawShape = (ctx, tool, x0, y0, x1, y1, strokeColor, size) => {
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "line") {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    } else if (tool === "arrow") {
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const headLen = Math.max(15, size * 4);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
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
      const cx = x0 + (x1 - x0) / 2;
      const cy = y0 + (y1 - y0) / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (tool === "triangle") {
      const mx = (x0 + x1) / 2;
      ctx.moveTo(mx, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x0, y1);
      ctx.closePath();
      ctx.stroke();
    }
  };

  // ── Text ──
  const placeText = (x, y, text, strokeColor, size) => {
    const ctx = canvasRef.current.getContext("2d");
    const fontSize = Math.max(16, size * 3);
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = strokeColor;
    ctx.fillText(text, x, y);
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

  // ── Mouse handlers ──
  const handleMouseDown = (e) => {
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
    if (!drawing.current) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    const overlayCtx = overlayRef.current.getContext("2d");

    if (activeTool === "pen" || activeTool === "eraser") {
      const drawColor = activeTool === "eraser" ? "#FFFFFF" : color;
      const seg = {
        x0: previousPoint.current.x, y0: previousPoint.current.y,
        x1: pos.x, y1: pos.y,
        color: drawColor, size: brushSize,
        tool: activeTool,
      };
      drawSegment(seg, ctx);
      currentStroke.current.push(seg);
      socket.emit("draw", [seg]);
      previousPoint.current = pos;
    } else {
      // Preview shape on overlay
      overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      drawShape(overlayCtx, activeTool, startPoint.current.x, startPoint.current.y, pos.x, pos.y, color, brushSize);
    }
  };

  const handleMouseUp = (e) => {
    if (!drawing.current) return;
    drawing.current = false;
    socket.emit("drawing-status", false);

    const pos = getPos(e);
    const overlayCtx = overlayRef.current.getContext("2d");
    overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

    if (activeTool !== "pen" && activeTool !== "eraser") {
      const ctx = canvasRef.current.getContext("2d");
      const shapeSeg = [{
        tool: activeTool,
        x0: startPoint.current.x, y0: startPoint.current.y,
        x1: pos.x, y1: pos.y,
        color, size: brushSize,
      }];
      drawShape(ctx, activeTool, startPoint.current.x, startPoint.current.y, pos.x, pos.y, color, brushSize);
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
    const stroke = [{ tool: "text", x: textInput.x, y: textInput.y, text: textValue, color, size: brushSize }];
    placeText(textInput.x, textInput.y, textValue, color, brushSize);
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

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex flex-col overflow-hidden">
      <Toolbar
        color={color} setColor={setColor}
        brushSize={brushSize} setBrushSize={setBrushSize}
        clearCanvas={clearCanvas} undoLastStroke={undoLastStroke}
        activeTool={activeTool} setActiveTool={setActiveTool}
      />

      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: "90px" }}>
        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900">
          {/* Main canvas */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {/* Shape preview overlay */}
          <canvas
            ref={overlayRef}
            className="absolute top-0 left-0 pointer-events-none"
          />
          {/* Text input */}
          {textInput && (
            <input
              ref={textInputRef}
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitText();
                if (e.key === "Escape") setTextInput(null);
              }}
              onBlur={commitText}
              style={{
                position: "absolute",
                left: textInput.x,
                top: textInput.y - 20,
                fontSize: `${Math.max(16, brushSize * 3)}px`,
                color: color,
                background: "transparent",
                border: "1.5px dashed #60a5fa",
                outline: "none",
                minWidth: "120px",
                fontFamily: "Inter, sans-serif",
              }}
            />
          )}
        </div>

        {/* Sidebar */}
        <ChatSidebar session={session} users={users} />
      </div>
    </div>
  );
};

export default CanvasBoard;