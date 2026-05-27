import { Trash2, Eraser, Undo2, Pencil, Square, Circle, Minus, Triangle, MoveRight, Type, Download } from "lucide-react";

const colors = [
  "#000000","#ef4444","#3b82f6","#22c55e","#eab308",
  "#a855f7","#ec4899","#f97316","#14b8a6","#ffffff",
];

const shapes = [
  { id: "pen",      icon: Pencil,    label: "Pen" },
  { id: "line",     icon: Minus,     label: "Line" },
  { id: "arrow",    icon: MoveRight, label: "Arrow" },
  { id: "rect",     icon: Square,    label: "Rectangle" },
  { id: "circle",   icon: Circle,    label: "Circle" },
  { id: "triangle", icon: Triangle,  label: "Triangle" },
  { id: "text",     icon: Type,      label: "Text" },
];

const Toolbar = ({
  color, setColor,
  brushSize, setBrushSize,
  clearCanvas, undoLastStroke,
  activeTool, setActiveTool,
  onExport,
}) => {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900/90 backdrop-blur-xl px-6 py-3 rounded-3xl border border-slate-700 shadow-2xl">

      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2.5 rounded-2xl text-white">
          <Pencil size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">SyncSketch</h1>
          <p className="text-xxxs text-slate-300">Realtime Collaborative Whiteboard</p>
        </div>
      </div>

      <div className="h-10 w-px bg-slate-600" />

      <div className="flex items-center gap-1">
        {shapes.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTool(id)} title={label}
            className={`p-2 rounded-xl transition-all duration-150 ${
              activeTool === id ? "bg-blue-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}>
            <Icon size={17} />
          </button>
        ))}
      </div>

      <div className="h-10 w-px bg-slate-600" />

      <div className="flex items-center gap-2">
        {colors.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            className={`w-7 h-7 rounded-full border-4 transition-all duration-200 ${
              color === c ? "scale-125 border-white" : "border-slate-500"
            }`}
            style={{ backgroundColor: c }} />
        ))}
      </div>

      <div className="h-10 w-px bg-slate-600" />

      <div className="flex flex-col items-center">
        <input type="range" min="2" max="30" value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-24" />
        <span className="text-white text-xs mt-1">{brushSize}px</span>
      </div>

      <div className="h-10 w-px bg-slate-600" />

      <div className="flex items-center gap-2">
        <button onClick={() => setActiveTool("eraser")} title="Eraser"
          className={`p-2 rounded-xl transition ${
            activeTool === "eraser" ? "bg-blue-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-white"
          }`}>
          <Eraser size={17} />
        </button>
        <button onClick={undoLastStroke} title="Undo"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition">
          <Undo2 size={17} />
        </button>
        <button onClick={onExport} title="Export as PNG"
          className="p-2 rounded-xl bg-green-600 hover:bg-green-500 text-white transition">
          <Download size={17} />
        </button>
        <button onClick={clearCanvas} title="Clear"
          className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition">
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;