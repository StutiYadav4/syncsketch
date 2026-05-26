import {
  Trash2,
  Eraser,
  Undo2,
  Pencil,
} from "lucide-react";

const colors = [
  "#000000",
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#ffffff",
];

const Toolbar = ({
  color,
  setColor,
  brushSize,
  setBrushSize,
  clearCanvas,
  undoLastStroke,
  setIsErasing,
}) => {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 bg-slate-900/90 backdrop-blur-xl px-8 py-4 rounded-3xl border border-slate-700 shadow-2xl">

      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-3 rounded-2xl text-white">
          <Pencil size={22} />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">
            SyncSketch
          </h1>
          
        </div>
      </div>

      <div className="h-12 w-px bg-slate-600"></div>

      <div className="flex items-center gap-3">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => {
              setColor(c);
              setIsErasing(false);
            }}
            className={`w-9 h-9 rounded-full border-4 transition-all duration-200 ${
              color === c
                ? "scale-125 border-white"
                : "border-slate-500"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="h-12 w-px bg-slate-600"></div>

      <div className="flex flex-col items-center">
        <input
          type="range"
          min="2"
          max="30"
          value={brushSize}
          onChange={(e) =>
            setBrushSize(Number(e.target.value))
          }
          className="w-32"
        />

        <span className="text-white text-sm mt-1">
          {brushSize}px
        </span>
      </div>

      <div className="h-12 w-px bg-slate-600"></div>

      <div className="flex items-center gap-3">

        <button
          onClick={() => setIsErasing(true)}
          className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
        >
          <Eraser size={20} />
        </button>

        <button
          onClick={undoLastStroke}
          className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
        >
          <Undo2 size={20} />
        </button>

        <button
          onClick={clearCanvas}
          className="p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white transition"
        >
          <Trash2 size={20} />
        </button>

      </div>
    </div>
  );
};

export default Toolbar;