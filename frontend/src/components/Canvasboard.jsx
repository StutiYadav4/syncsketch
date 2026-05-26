import { useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";
import Toolbar from "./Toolbar";
import ChatSidebar from "./ChatSidebar";

const CanvasBoard = ({ session }) => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const previousPoint = useRef(null);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isErasing, setIsErasing] = useState(false);
  const [strokes, setStrokes] = useState(session.strokes || []);
  const currentStroke = useRef([]);
  const [users, setUsers] = useState(session.users || []);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 1100;
    canvas.height = 650;
    const ctx = canvas.getContext("2d");
    initializeCanvas(ctx);

    // Replay existing strokes from room
    if (session.strokes?.length) {
      session.strokes.forEach((stroke) => renderStroke(stroke, ctx));
    }

    socket.on("draw", (stroke) => renderStroke(stroke, ctx));
    socket.on("clear-canvas", () => clearCanvasLocal());
    socket.on("user-list", (updatedUsers) => setUsers(updatedUsers));

    return () => {
      socket.off("draw");
      socket.off("clear-canvas");
      socket.off("user-list");
    };
  }, []);

  const initializeCanvas = (ctx) => {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const drawLine = (x0, y0, x1, y1, color, size, ctx) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.closePath();
  };

  const renderStroke = (stroke, ctx) => {
    stroke.forEach((segment) => {
      drawLine(segment.x0, segment.y0, segment.x1, segment.y1, segment.color, segment.size, ctx);
    });
  };

  const redrawCanvas = (allStrokes) => {
    const ctx = canvasRef.current.getContext("2d");
    initializeCanvas(ctx);
    allStrokes.forEach((stroke) => renderStroke(stroke, ctx));
  };

  const startDrawing = (e) => {
    setDrawing(true);
    currentStroke.current = [];
    socket.emit("drawing-status", true);
    const rect = canvasRef.current.getBoundingClientRect();
    previousPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const stopDrawing = () => {
    if (!drawing) return;
    setDrawing(false);
    socket.emit("drawing-status", false);
    if (currentStroke.current.length > 0) {
      setStrokes((prev) => [...prev, currentStroke.current]);
    }
    previousPoint.current = null;
  };

  const draw = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const currentPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const drawColor = isErasing ? "#FFFFFF" : color;
    const segment = {
      x0: previousPoint.current.x, y0: previousPoint.current.y,
      x1: currentPoint.x, y1: currentPoint.y,
      color: drawColor, size: brushSize,
    };
    drawLine(segment.x0, segment.y0, segment.x1, segment.y1, segment.color, segment.size, ctx);
    currentStroke.current.push(segment);
    socket.emit("draw", [segment]);
    previousPoint.current = currentPoint;
  };

  const clearCanvasLocal = () => {
    initializeCanvas(canvasRef.current.getContext("2d"));
  };

  const clearCanvas = () => {
    clearCanvasLocal();
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
        setIsErasing={setIsErasing}
      />

      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: "90px" }}>
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            className="bg-white rounded-2xl border-[12px] border-amber-900 shadow-2xl cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseMove={draw}
            onMouseLeave={stopDrawing}
          />
        </div>

        {/* Sidebar */}
        <ChatSidebar session={session} users={users} />
      </div>
    </div>
  );
};

export default CanvasBoard;