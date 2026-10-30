import { useEffect, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { Download, Eraser, ImagePlus, Pencil, Trash2 } from "lucide-react";
import { useFs } from "../store/fs";
import { useOS } from "../store/os";

const palette = ["#111111", "#ef4444", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899", "#ffffff"];

export default function Paint() {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#111111");
  const [size, setSize] = useState(4);

  const clear = () => {
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
  };
  useEffect(clear, []);

  const point = (e: RPointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };
  const draw = (e: RPointerEvent<HTMLCanvasElement>) => {
    const g = e.currentTarget.getContext("2d");
    if (!g) return;
    const p = point(e);
    const from = last.current ?? p;
    g.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    g.lineWidth = tool === "eraser" ? size * 3 : size;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(p.x + 0.01, p.y);
    g.stroke();
    last.current = p;
  };
  const saveToGallery = () => {
    const c = ref.current;
    if (!c) return;
    useFs.getState().touch("pictures", "lukisan.png", c.toDataURL("image/png"));
    useOS.getState().notify("Tersimpan", "Lukisan disimpan di folder Gambar.");
  };
  const save = () => {
    const c = ref.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "lukisan-dapos.png";
    a.click();
  };

  return (
    <div className="pt">
      <div className="pt-bar">
        <button className={"icon-btn" + (tool === "pen" ? " on" : "")} aria-label="Pena" onClick={() => setTool("pen")}>
          <Pencil size={16} />
        </button>
        <button className={"icon-btn" + (tool === "eraser" ? " on" : "")} aria-label="Penghapus" onClick={() => setTool("eraser")}>
          <Eraser size={16} />
        </button>
        <span className="pt-sep" />
        {palette.map((c) => (
          <button
            key={c}
            aria-label={`Warna ${c}`}
            className={"swatch sm" + (color === c && tool === "pen" ? " on" : "")}
            style={{ background: c }}
            onClick={() => {
              setColor(c);
              setTool("pen");
            }}
          />
        ))}
        <input type="color" aria-label="Warna kustom" value={color} onChange={(e) => { setColor(e.target.value); setTool("pen"); }} />
        <span className="pt-sep" />
        <input type="range" min={1} max={30} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Ukuran kuas" />
        <span className="grow" />
        <button className="icon-btn" aria-label="Bersihkan kanvas" onClick={clear}>
          <Trash2 size={16} />
        </button>
        <button className="icon-btn" aria-label="Simpan ke folder Gambar" title="Simpan ke folder Gambar" onClick={saveToGallery}>
          <ImagePlus size={16} />
        </button>
        <button className="icon-btn" aria-label="Unduh sebagai PNG" title="Unduh sebagai PNG" onClick={save}>
          <Download size={16} />
        </button>
      </div>
      <div className="pt-wrap">
        <canvas
          ref={ref}
          width={900}
          height={560}
          className="pt-canvas"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            last.current = null;
            draw(e);
          }}
          onPointerMove={(e) => drawing.current && draw(e)}
          onPointerUp={() => {
            drawing.current = false;
            last.current = null;
          }}
          onPointerCancel={() => {
            drawing.current = false;
            last.current = null;
          }}
        />
      </div>
    </div>
  );
}
