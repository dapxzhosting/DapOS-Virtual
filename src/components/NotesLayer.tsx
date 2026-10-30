import { X } from "lucide-react";
import { noteColors, useOS } from "../store/os";
import type { StickyNote } from "../types";
import type { PointerEvent as RPointerEvent } from "react";

function Note({ n }: { n: StickyNote }) {
  const update = useOS((s) => s.updateNote);
  const remove = useOS((s) => s.removeNote);

  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const sx = e.clientX - n.x;
    const sy = e.clientY - n.y;
    const move = (ev: PointerEvent) => update(n.id, { x: Math.max(0, ev.clientX - sx), y: Math.max(0, ev.clientY - sy) });
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  return (
    <div className="note" style={{ left: n.x, top: n.y, background: n.color }} onMouseDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}>
      <div className="note-bar" onPointerDown={down}>
        <span className="note-dots">
          {noteColors.map((c) => (
            <button key={c} aria-label={`Warna ${c}`} style={{ background: c }} onClick={() => update(n.id, { color: c })} />
          ))}
        </span>
        <button aria-label="Hapus catatan" onClick={() => remove(n.id)}>
          <X size={14} />
        </button>
      </div>
      <textarea
        value={n.text}
        placeholder="Tulis catatan…"
        spellCheck={false}
        onChange={(e) => update(n.id, { text: e.target.value })}
      />
    </div>
  );
}

export default function NotesLayer() {
  const notes = useOS((s) => s.notes);
  return (
    <>
      {notes.map((n) => (
        <Note key={n.id} n={n} />
      ))}
    </>
  );
}
